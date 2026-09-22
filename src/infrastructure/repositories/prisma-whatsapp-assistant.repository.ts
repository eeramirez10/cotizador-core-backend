import type {
  WhatsAppAssistantActionType,
  WhatsAppAssistantJobEntity,
  WhatsAppAssistantPrincipal,
  WhatsAppAssistantQuoteDetails,
  WhatsAppAssistantQuoteItemSearch,
  WhatsAppAssistantQuoteSummary,
  WhatsAppCustomerChangeRequestEntity,
  WhatsAppPendingActionEntity,
} from "../../domain/entities/whatsapp-assistant.entity";
import { WhatsAppAssistantRepository } from "../../domain/repositories/whatsapp-assistant.repository";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";
import { PrismaWhatsAppParticipantResolver } from "./prisma-whatsapp-participant-resolver";

const visibleStatuses = ["QUOTED", "APPROVED", "REJECTED", "SUPERSEDED"] as const;

export class PrismaWhatsAppAssistantRepository extends WhatsAppAssistantRepository {
  private readonly participantResolver = new PrismaWhatsAppParticipantResolver();

  async getPrincipal(conversationId: string): Promise<WhatsAppAssistantPrincipal> {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      select: {
        participantPhoneE164: true,
        participantType: true,
        internalUserId: true,
      },
    });
    if (!conversation) return this.unknownPrincipal();

    const principal = await this.participantResolver.resolve(conversation.participantPhoneE164);
    if (
      conversation.participantType !== principal.audience
      || conversation.internalUserId !== principal.userId
    ) {
      await prisma.whatsAppConversation.update({
        where: { id: conversationId },
        data: {
          participantType: principal.audience,
          internalUserId: principal.userId,
          principalResolvedAt: new Date(),
          previousResponseId: null,
        },
      });
    }
    return principal;
  }

  async getParticipantPhone(conversationId: string): Promise<string | null> {
    return this.participantPhone(conversationId);
  }

  async claimNextJob(staleBefore: Date): Promise<WhatsAppAssistantJobEntity | null> {
    const candidate = await prisma.whatsAppAssistantJob.findFirst({
      where: {
        nextAttemptAt: { lte: new Date() },
        conversation: { mode: "AI" },
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
        inboundMessage: {
          select: {
            body: true,
            mediaCount: true,
            attachments: {
              orderBy: { createdAt: "asc" },
              select: { id: true, originalName: true, mimeType: true },
            },
          },
        },
      },
    });
    if (!candidate) return null;

    // Compare-and-set prevents two workers from claiming the same job without
    // keeping a database transaction open across the candidate lookup.
    const claimed = await prisma.whatsAppAssistantJob.updateMany({
      where: {
        id: candidate.id,
        conversation: { mode: "AI" },
        OR: candidate.status === "PENDING"
          ? [{ status: "PENDING" }]
          : [{
            status: "PROCESSING",
            lockedAt: candidate.lockedAt,
          }],
      },
      data: {
        status: "PROCESSING",
        lockedAt: new Date(),
        attempts: { increment: 1 },
        errorMessage: null,
      },
    });
    if (claimed.count === 0) return null;

    const principal = await this.getPrincipal(candidate.conversationId);
    const conversationContext = await prisma.whatsAppConversation.findUnique({
      where: { id: candidate.conversationId },
      select: { previousResponseId: true },
    });

    return {
      id: candidate.id,
      conversationId: candidate.conversationId,
      participantPhone: candidate.conversation.participantPhoneE164,
      message: candidate.inboundMessage.body?.trim() || "El cliente envió un archivo sin texto.",
      mediaCount: candidate.inboundMessage.mediaCount,
      attachments: candidate.inboundMessage.attachments,
      previousResponseId: conversationContext?.previousResponseId ?? null,
      attempts: candidate.attempts + 1,
      principal,
    };
  }

  async isConversationAiControlled(conversationId: string): Promise<boolean> {
    const row = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      select: { mode: true },
    });
    return row?.mode === "AI";
  }

  async cancelJob(jobId: string, reason: string, cancelledAt: Date): Promise<void> {
    await prisma.whatsAppAssistantJob.updateMany({
      where: { id: jobId, status: { in: ["PENDING", "PROCESSING"] } },
      data: {
        status: "CANCELLED",
        lockedAt: null,
        completedAt: cancelledAt,
        errorMessage: reason.slice(0, 2000),
      },
    });
  }

  async completeJob(input: {
    jobId: string;
    conversationId: string;
    responseId: string;
    body: string;
    providerMessageId: string;
    sentAt: Date;
  }): Promise<{ outboundMessageId: string }> {
    const [, , message] = await prisma.$transaction([
      prisma.whatsAppAssistantJob.update({
        where: { id: input.jobId },
        data: { status: "COMPLETED", completedAt: input.sentAt, lockedAt: null, errorMessage: null },
      }),
      prisma.whatsAppConversation.update({
        where: { id: input.conversationId },
        data: {
          previousResponseId: input.responseId,
          lastAssistantAt: input.sentAt,
          lastMessageAt: input.sentAt,
        },
      }),
      prisma.whatsAppOutboundMessage.create({
        data: {
          conversationId: input.conversationId,
          providerMessageId: input.providerMessageId,
          authorType: "AI",
          messageType: "TEXT",
          status: "QUEUED",
          body: input.body,
          sentAt: input.sentAt,
        },
        select: { id: true },
      }),
    ]);
    return { outboundMessageId: message.id };
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
        customerId: true,
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
        customerId: true,
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
      customerId: row.customerId,
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

  async searchAuthorizedQuoteItems(input: {
    conversationId: string;
    quoteNumber: string;
    query: string | null;
    position: number | null;
    limit: number;
  }): Promise<WhatsAppAssistantQuoteItemSearch | null> {
    const phone = await this.participantPhone(input.conversationId);
    if (!phone) return null;
    const quote = await prisma.quote.findFirst({
      where: {
        quoteNumber: input.quoteNumber.trim().toUpperCase(),
        archivedAt: null,
        status: { in: [...visibleStatuses] },
        deliveryAttempts: {
          some: { channel: "WHATSAPP", recipient: phone, status: { not: "FAILED" } },
        },
      },
      select: {
        quoteNumber: true,
        currency: true,
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            externalProductCode: true,
            customerDescription: true,
            erpDescription: true,
            qty: true,
            unit: true,
            unitPrice: true,
            subtotal: true,
            deliveryTime: true,
            itemComment: true,
          },
        },
      },
    });
    if (!quote) return null;

    const query = this.searchText(input.query || "");
    const positioned = quote.items.map((item, index) => ({ item, position: index + 1 }));
    const matches = positioned.filter(({ item, position }) => {
      if (input.position !== null) return position === input.position;
      if (!query) return false;
      return [
        item.externalProductCode,
        item.customerDescription,
        item.erpDescription,
      ].some((value) => this.searchText(value || "").includes(query));
    });
    const limit = Math.min(Math.max(input.limit, 1), 5);
    return {
      quoteNumber: quote.quoteNumber,
      currency: quote.currency,
      totalMatches: matches.length,
      truncated: matches.length > limit,
      items: matches.slice(0, limit).map(({ item, position }) => ({
        position,
        code: item.externalProductCode,
        description: item.customerDescription || item.erpDescription || "Partida sin descripción",
        quantity: Number(item.qty),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.subtotal),
        deliveryTime: item.deliveryTime,
        customerComment: item.itemComment,
      })),
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
    requestType: "INFORMATION" | "MODIFICATION";
  }): Promise<{ id: string; created: boolean }> {
    const existing = await prisma.whatsAppCustomerChangeRequest.findFirst({
      where: {
        conversationId: input.conversationId,
        quoteId: input.quoteId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        requestedChanges: input.requestedChanges,
        requestType: input.requestType,
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
          note: input.requestType === "INFORMATION"
            ? `Cliente solicitó información por WhatsApp: ${input.requestedChanges}`
            : `Cliente solicitó cambios por WhatsApp: ${input.requestedChanges}`,
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
        requestType: true,
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

  private searchText(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  private unknownPrincipal(): WhatsAppAssistantPrincipal {
    return {
      audience: "UNKNOWN",
      displayName: "Usuario de WhatsApp",
      phoneE164: "",
      userId: null,
      role: null,
      branchId: null,
      branchName: null,
      reportScope: null,
      reportBranchId: null,
      reportRange: null,
      isVerified: false,
    };
  }
}
