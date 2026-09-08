import type {
  WhatsAppAssistantActionType,
  WhatsAppAssistantJobEntity,
  WhatsAppAssistantQuoteDetails,
  WhatsAppAssistantQuoteSummary,
  WhatsAppCustomerChangeRequestEntity,
  WhatsAppPendingActionEntity,
} from "../../domain/entities/whatsapp-assistant.entity";
import { WhatsAppAssistantRepository } from "../../domain/repositories/whatsapp-assistant.repository";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

const visibleStatuses = ["QUOTED", "APPROVED", "REJECTED", "SUPERSEDED"] as const;

export class PrismaWhatsAppAssistantRepository extends WhatsAppAssistantRepository {
  async getParticipantPhone(conversationId: string): Promise<string | null> {
    return this.participantPhone(conversationId);
  }

  async claimNextJob(staleBefore: Date): Promise<WhatsAppAssistantJobEntity | null> {
    return prisma.$transaction(async (tx) => {
      const candidate = await tx.whatsAppAssistantJob.findFirst({
        where: {
          nextAttemptAt: { lte: new Date() },
          OR: [
            { status: "PENDING" },
            { status: "PROCESSING", lockedAt: { lt: staleBefore } },
          ],
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          lockedAt: true,
          attempts: true,
          conversationId: true,
          conversation: { select: { participantPhoneE164: true, previousResponseId: true } },
          inboundMessage: { select: { body: true, mediaCount: true } },
        },
      });
      if (!candidate) return null;

      const claimed = await tx.whatsAppAssistantJob.updateMany({
        where: {
          id: candidate.id,
          OR: [
            { status: "PENDING" },
            { status: "PROCESSING", lockedAt: candidate.lockedAt },
          ],
        },
        data: {
          status: "PROCESSING",
          lockedAt: new Date(),
          attempts: { increment: 1 },
          errorMessage: null,
        },
      });
      if (claimed.count === 0) return null;

      return {
        id: candidate.id,
        conversationId: candidate.conversationId,
        participantPhone: candidate.conversation.participantPhoneE164,
        message: candidate.inboundMessage.body?.trim() || "El cliente envió un archivo sin texto.",
        mediaCount: candidate.inboundMessage.mediaCount,
        previousResponseId: candidate.conversation.previousResponseId,
        attempts: candidate.attempts + 1,
      };
    });
  }

  async completeJob(input: {
    jobId: string;
    conversationId: string;
    responseId: string;
    body: string;
    providerMessageId: string;
    sentAt: Date;
  }): Promise<void> {
    await prisma.$transaction([
      prisma.whatsAppAssistantJob.update({
        where: { id: input.jobId },
        data: { status: "COMPLETED", completedAt: input.sentAt, lockedAt: null, errorMessage: null },
      }),
      prisma.whatsAppConversation.update({
        where: { id: input.conversationId },
        data: { previousResponseId: input.responseId, lastAssistantAt: input.sentAt },
      }),
      prisma.whatsAppOutboundMessage.create({
        data: {
          conversationId: input.conversationId,
          providerMessageId: input.providerMessageId,
          body: input.body,
          sentAt: input.sentAt,
        },
      }),
    ]);
  }

  async failJob(input: { jobId: string; errorMessage: string; retryAt: Date; final: boolean }): Promise<void> {
    await prisma.whatsAppAssistantJob.update({
      where: { id: input.jobId },
      data: {
        status: input.final ? "FAILED" : "PENDING",
        nextAttemptAt: input.retryAt,
        lockedAt: null,
        errorMessage: input.errorMessage.slice(0, 2000),
      },
    });
  }

  async listAuthorizedQuotes(conversationId: string, limit: number): Promise<WhatsAppAssistantQuoteSummary[]> {
    const phone = await this.participantPhone(conversationId);
    if (!phone) return [];
    const rows = await prisma.quote.findMany({
      where: {
        archivedAt: null,
        status: { in: [...visibleStatuses] },
        deliveryAttempts: {
          some: { channel: "WHATSAPP", recipient: phone, status: { not: "FAILED" } },
        },
      },
      orderBy: [{ firstSentAt: "desc" }, { createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 10),
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        currency: true,
        total: true,
        validUntil: true,
        createdByUser: { select: { firstName: true, lastName: true } },
        items: { take: 3, orderBy: { createdAt: "asc" }, select: { erpDescription: true, customerDescription: true } },
        deliveryAttempts: {
          where: { channel: "WHATSAPP", recipient: phone, status: { not: "FAILED" } },
          orderBy: { sentAt: "desc" },
          take: 1,
          select: { sentAt: true },
        },
      },
    });
    return rows.map((row) => this.toSummary(row));
  }

  async findAuthorizedQuote(conversationId: string, quoteNumber: string): Promise<WhatsAppAssistantQuoteDetails | null> {
    const phone = await this.participantPhone(conversationId);
    if (!phone) return null;
    const row = await prisma.quote.findFirst({
      where: {
        quoteNumber: quoteNumber.trim().toUpperCase(),
        archivedAt: null,
        status: { in: [...visibleStatuses] },
        deliveryAttempts: {
          some: { channel: "WHATSAPP", recipient: phone, status: { not: "FAILED" } },
        },
      },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        currency: true,
        subtotal: true,
        tax: true,
        total: true,
        validUntil: true,
        deliveryPlace: true,
        paymentTerms: true,
        revisionNumber: true,
        orderStatus: true,
        branchId: true,
        customerContactId: true,
        createdByUserId: true,
        createdByUser: { select: { firstName: true, lastName: true } },
        items: { take: 5, orderBy: { createdAt: "asc" }, select: { erpDescription: true, customerDescription: true } },
        deliveryAttempts: {
          where: { channel: "WHATSAPP", recipient: phone, status: { not: "FAILED" } },
          orderBy: { sentAt: "desc" },
          take: 1,
          select: { sentAt: true },
        },
      },
    });
    if (!row) return null;
    return {
      ...this.toSummary(row),
      subtotal: Number(row.subtotal),
      tax: Number(row.tax),
      deliveryPlace: row.deliveryPlace,
      paymentTerms: row.paymentTerms,
      revisionNumber: row.revisionNumber,
      orderStatus: row.orderStatus,
      contactId: row.customerContactId,
      sellerId: row.createdByUserId,
      branchId: row.branchId,
    };
  }

  async listRejectionReasons(conversationId: string, quoteNumber: string) {
    const quote = await this.findAuthorizedQuote(conversationId, quoteNumber);
    if (!quote) return [];
    const rows = await prisma.quoteCatalogOption.findMany({
      where: {
        type: "REJECTION_REASON",
        isActive: true,
        OR: [{ branchId: null }, { branchId: quote.branchId }],
      },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: { code: true, label: true, requiresComment: true, branchId: true },
    });
    const byCode = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      const current = byCode.get(row.code);
      if (!current || row.branchId === quote.branchId) byCode.set(row.code, row);
    }
    return [...byCode.values()].map(({ code, label, requiresComment }) => ({ code, label, requiresComment }));
  }

  async prepareAction(input: {
    conversationId: string;
    preparedTurnId: string;
    quoteId: string;
    actionType: WhatsAppAssistantActionType;
    payload: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<WhatsAppPendingActionEntity> {
    return prisma.$transaction(async (tx) => {
      await tx.whatsAppPendingAction.updateMany({
        where: { conversationId: input.conversationId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      const row = await tx.whatsAppPendingAction.create({
        data: {
          conversationId: input.conversationId,
          preparedTurnId: input.preparedTurnId,
          quoteId: input.quoteId,
          actionType: input.actionType,
          payload: input.payload as Prisma.InputJsonValue,
          expiresAt: input.expiresAt,
        },
        include: { quote: { select: { quoteNumber: true } } },
      });
      return {
        id: row.id,
        quoteId: row.quoteId,
        quoteNumber: row.quote.quoteNumber,
        actionType: row.actionType,
        payload: this.jsonRecord(row.payload),
        expiresAt: row.expiresAt,
      };
    });
  }

  async findPendingAction(input: {
    conversationId: string;
    currentTurnId: string;
    quoteId: string;
    actionType: WhatsAppAssistantActionType;
    now: Date;
  }): Promise<WhatsAppPendingActionEntity | null> {
    await prisma.whatsAppPendingAction.updateMany({
      where: { conversationId: input.conversationId, status: "PENDING", expiresAt: { lte: input.now } },
      data: { status: "EXPIRED" },
    });
    const row = await prisma.whatsAppPendingAction.findFirst({
      where: {
        conversationId: input.conversationId,
        quoteId: input.quoteId,
        actionType: input.actionType,
        preparedTurnId: { not: input.currentTurnId },
        status: "PENDING",
        expiresAt: { gt: input.now },
      },
      orderBy: { createdAt: "desc" },
      include: { quote: { select: { quoteNumber: true } } },
    });
    return row ? {
      id: row.id,
      quoteId: row.quoteId,
      quoteNumber: row.quote.quoteNumber,
      actionType: row.actionType,
      payload: this.jsonRecord(row.payload),
      expiresAt: row.expiresAt,
    } : null;
  }

  async markActionExecuted(actionId: string, executedAt: Date): Promise<void> {
    await prisma.whatsAppPendingAction.update({
      where: { id: actionId },
      data: { status: "EXECUTED", executedAt },
    });
  }

  async createChangeRequest(input: {
    conversationId: string;
    quoteId: string;
    customerContactId: string | null;
    requestedByPhone: string;
    requestedChanges: string;
  }): Promise<{ id: string; created: boolean }> {
    const existing = await prisma.whatsAppCustomerChangeRequest.findFirst({
      where: {
        conversationId: input.conversationId,
        quoteId: input.quoteId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        requestedChanges: input.requestedChanges,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (existing) return { id: existing.id, created: false };
    const row = await prisma.$transaction(async (tx) => {
      const request = await tx.whatsAppCustomerChangeRequest.create({ data: input, select: { id: true } });
      const quote = await tx.quote.findUniqueOrThrow({ where: { id: input.quoteId }, select: { status: true } });
      await tx.quoteEvent.create({
        data: {
          quoteId: input.quoteId,
          status: quote.status,
          actorUserId: null,
          note: `Cliente solicitó cambios por WhatsApp: ${input.requestedChanges}`,
        },
      });
      return request;
    });
    return { id: row.id, created: true };
  }

  async listChangeRequests(quoteId: string): Promise<WhatsAppCustomerChangeRequestEntity[]> {
    return prisma.whatsAppCustomerChangeRequest.findMany({
      where: { quoteId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quoteId: true,
        requestedByPhone: true,
        requestedChanges: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private async participantPhone(conversationId: string): Promise<string | null> {
    const row = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      select: { participantPhoneE164: true },
    });
    return row?.participantPhoneE164 ?? null;
  }

  private toSummary(row: {
    id: string;
    quoteNumber: string;
    status: string;
    currency: string;
    total: unknown;
    validUntil: Date;
    createdByUser: { firstName: string; lastName: string };
    items: Array<{ erpDescription: string | null; customerDescription: string | null }>;
    deliveryAttempts: Array<{ sentAt: Date }>;
  }): WhatsAppAssistantQuoteSummary {
    return {
      id: row.id,
      quoteNumber: row.quoteNumber,
      status: row.status,
      currency: row.currency,
      total: Number(row.total),
      validUntil: row.validUntil,
      sentAt: row.deliveryAttempts[0]?.sentAt ?? new Date(0),
      sellerName: `${row.createdByUser.firstName} ${row.createdByUser.lastName}`.trim(),
      itemDescriptions: row.items
        .map((item) => item.erpDescription || item.customerDescription)
        .filter((value): value is string => Boolean(value)),
    };
  }

  private jsonRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
}
