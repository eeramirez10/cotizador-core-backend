import type {
  WhatsAppInternalQuoteDetails,
  WhatsAppInternalQuoteScope,
  WhatsAppInternalQuoteSummary,
} from "../../domain/entities/whatsapp-assistant.entity";
import { WhatsAppInternalAssistantRepository } from "../../domain/repositories/whatsapp-internal-assistant.repository";
import type { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

const quoteSelect = {
  id: true,
  quoteNumber: true,
  status: true,
  currency: true,
  subtotal: true,
  tax: true,
  total: true,
  deliveryPlace: true,
  paymentTerms: true,
  orderStatus: true,
  revisionNumber: true,
  createdAt: true,
  validUntil: true,
  customer: { select: { legalName: true, displayName: true } },
  createdByUser: { select: { firstName: true, lastName: true } },
  branch: { select: { name: true } },
  items: {
    orderBy: { createdAt: "asc" as const },
    take: 10,
    select: { erpDescription: true, customerDescription: true },
  },
} satisfies Prisma.QuoteSelect;

type QuoteRow = Prisma.QuoteGetPayload<{ select: typeof quoteSelect }>;

export class PrismaWhatsAppInternalAssistantRepository extends WhatsAppInternalAssistantRepository {
  async getVerification(userId: string) {
    return prisma.whatsAppInternalVerification.findUnique({
      where: { userId },
      select: {
        userId: true,
        phoneE164: true,
        verificationRequestedAt: true,
        verifiedAt: true,
        verifiedUntil: true,
        failedAttempts: true,
      },
    });
  }

  async markVerificationRequested(userId: string, phoneE164: string, at: Date): Promise<void> {
    await prisma.whatsAppInternalVerification.upsert({
      where: { userId },
      create: { userId, phoneE164, verificationRequestedAt: at },
      update: {
        phoneE164,
        verificationRequestedAt: at,
        verifiedAt: null,
        verifiedUntil: null,
        failedAttempts: 0,
      },
    });
  }

  async markVerificationFailed(userId: string, phoneE164: string): Promise<void> {
    await prisma.whatsAppInternalVerification.upsert({
      where: { userId },
      create: { userId, phoneE164, failedAttempts: 1 },
      update: { phoneE164, failedAttempts: { increment: 1 } },
    });
  }

  async markVerified(userId: string, phoneE164: string, at: Date, until: Date): Promise<void> {
    await prisma.whatsAppInternalVerification.upsert({
      where: { userId },
      create: { userId, phoneE164, verifiedAt: at, verifiedUntil: until },
      update: {
        phoneE164,
        verifiedAt: at,
        verifiedUntil: until,
        failedAttempts: 0,
      },
    });
  }

  async listQuotes(input: {
    scope: WhatsAppInternalQuoteScope;
    limit: number;
    status: string | null;
  }): Promise<WhatsAppInternalQuoteSummary[]> {
    const rows = await prisma.quote.findMany({
      where: {
        archivedAt: null,
        ...this.scopeWhere(input.scope),
        ...(input.status ? { status: input.status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(input.limit, 1), 20),
      select: quoteSelect,
    });
    return rows.map((row) => this.summary(row));
  }

  async findQuote(input: {
    scope: WhatsAppInternalQuoteScope;
    quoteNumber: string;
  }): Promise<WhatsAppInternalQuoteDetails | null> {
    const row = await prisma.quote.findFirst({
      where: {
        quoteNumber: input.quoteNumber.trim().toUpperCase(),
        archivedAt: null,
        ...this.scopeWhere(input.scope),
      },
      select: quoteSelect,
    });
    if (!row) return null;
    return {
      ...this.summary(row),
      subtotal: Number(row.subtotal),
      tax: Number(row.tax),
      deliveryPlace: row.deliveryPlace,
      paymentTerms: row.paymentTerms,
      orderStatus: row.orderStatus,
      revisionNumber: row.revisionNumber,
      itemDescriptions: row.items
        .map((item) => item.erpDescription || item.customerDescription)
        .filter((value): value is string => Boolean(value)),
    };
  }

  private scopeWhere(scope: WhatsAppInternalQuoteScope): Prisma.QuoteWhereInput {
    if (scope.type === "GLOBAL") return {};
    if (scope.type === "BRANCH") return { branchId: scope.id };
    return { createdByUserId: scope.id };
  }

  private summary(row: QuoteRow): WhatsAppInternalQuoteSummary {
    return {
      id: row.id,
      quoteNumber: row.quoteNumber,
      status: row.status,
      currency: row.currency,
      total: Number(row.total),
      customerName: row.customer.legalName || row.customer.displayName,
      sellerName: `${row.createdByUser.firstName} ${row.createdByUser.lastName}`.trim(),
      branchName: row.branch.name,
      createdAt: row.createdAt,
      validUntil: row.validUntil,
    };
  }
}
