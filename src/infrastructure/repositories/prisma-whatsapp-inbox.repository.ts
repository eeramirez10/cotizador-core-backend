import type {
  Prisma,
  WhatsAppConversationMode,
  WhatsAppOutboundMessageStatus,
} from "../database/generated/client";
import type {
  RegisterWhatsAppQuoteDeliveryInput,
  WhatsAppInboxActor,
  WhatsAppInboxConversation,
  WhatsAppInboxConversationPage,
  WhatsAppInboxMessage,
  WhatsAppInboxMessagePage,
} from "../../domain/entities/whatsapp-inbox.entity";
import { WhatsAppInboxRepository } from "../../domain/repositories/whatsapp-inbox.repository";
import { prisma } from "../database/prisma-client";

const conversationInclude = {
  handledByUser: { select: { firstName: true, lastName: true } },
  accesses: {
    orderBy: { updatedAt: "desc" as const },
    include: {
      customer: { select: { id: true, displayName: true, legalName: true } },
      customerContact: { select: { id: true, name: true } },
      quote: { select: { id: true, quoteNumber: true, status: true } },
      user: { select: { firstName: true, lastName: true } },
    },
  },
  inboundMessages: {
    orderBy: { receivedAt: "desc" as const },
    take: 1,
    select: { body: true, mediaCount: true, receivedAt: true },
  },
  outboundMessages: {
    orderBy: { sentAt: "desc" as const },
    take: 1,
    select: { body: true, sentAt: true },
  },
  readStates: {
    select: { userId: true, lastReadAt: true },
  },
} satisfies Prisma.WhatsAppConversationInclude;

type ConversationRow = Prisma.WhatsAppConversationGetPayload<{ include: typeof conversationInclude }>;

export class PrismaWhatsAppInboxRepository extends WhatsAppInboxRepository {
  async listConversations(input: {
    actor: WhatsAppInboxActor;
    search?: string;
    cursor?: string;
    pageSize: number;
  }): Promise<WhatsAppInboxConversationPage> {
    const cursor = this.decodeCursor(input.cursor);
    const search = input.search?.trim();
    const where: Prisma.WhatsAppConversationWhereInput = {
      AND: [
        this.visibilityWhere(input.actor),
        ...(cursor ? [{
          OR: [
            { lastMessageAt: { lt: cursor.at } },
            { lastMessageAt: cursor.at, id: { lt: cursor.id } },
          ],
        }] : []),
        ...(search ? [{
          OR: [
            { participantPhoneE164: { contains: search } },
            {
              accesses: {
                some: {
                  OR: [
                    { customer: { displayName: { contains: search, mode: "insensitive" as const } } },
                    { customer: { legalName: { contains: search, mode: "insensitive" as const } } },
                    { customerContact: { name: { contains: search, mode: "insensitive" as const } } },
                    { quote: { quoteNumber: { contains: search, mode: "insensitive" as const } } },
                    { user: { firstName: { contains: search, mode: "insensitive" as const } } },
                    { user: { lastName: { contains: search, mode: "insensitive" as const } } },
                  ],
                },
              },
            },
          ],
        }] : []),
      ],
    };

    const rows = await prisma.whatsAppConversation.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: input.pageSize + 1,
      include: conversationInclude,
    });
    const hasMore = rows.length > input.pageSize;
    const visible = rows.slice(0, input.pageSize);
    return {
      items: visible.map((row) => this.toConversation(row, input.actor)),
      hasMore,
      nextCursor: hasMore && visible.length > 0
        ? this.encodeCursor(visible[visible.length - 1].lastMessageAt, visible[visible.length - 1].id)
        : null,
    };
  }

  async findConversation(input: {
    conversationId: string;
    actor: WhatsAppInboxActor;
  }): Promise<WhatsAppInboxConversation | null> {
    const row = await prisma.whatsAppConversation.findFirst({
      where: {
        id: input.conversationId,
        ...this.visibilityWhere(input.actor),
      },
      include: conversationInclude,
    });
    return row ? this.toConversation(row, input.actor) : null;
  }

  async listMessages(input: {
    conversationId: string;
    actor: WhatsAppInboxActor;
    cursor?: string;
    pageSize: number;
  }): Promise<WhatsAppInboxMessagePage> {
    const allowed = await prisma.whatsAppConversation.findFirst({
      where: { id: input.conversationId, ...this.visibilityWhere(input.actor) },
      select: { id: true },
    });
    if (!allowed) return { items: [], nextCursor: null, hasMore: false };

    const before = this.decodeMessageCursor(input.cursor);
    const [inbound, outbound] = await Promise.all([
      prisma.whatsAppInboundMessage.findMany({
        where: {
          conversationId: input.conversationId,
          ...(before ? { receivedAt: { lt: before } } : {}),
        },
        orderBy: { receivedAt: "desc" },
        take: input.pageSize + 1,
        select: {
          id: true,
          conversationId: true,
          body: true,
          mediaCount: true,
          receivedAt: true,
        },
      }),
      prisma.whatsAppOutboundMessage.findMany({
        where: {
          conversationId: input.conversationId,
          ...(before ? { sentAt: { lt: before } } : {}),
        },
        orderBy: { sentAt: "desc" },
        take: input.pageSize + 1,
        select: {
          id: true,
          conversationId: true,
          authorType: true,
          messageType: true,
          status: true,
          body: true,
          fileAssetId: true,
          sentAt: true,
          sentByUser: { select: { firstName: true, lastName: true } },
          quote: { select: { id: true, quoteNumber: true, status: true } },
        },
      }),
    ]);

    const messages: WhatsAppInboxMessage[] = [
      ...inbound.map((row): WhatsAppInboxMessage => ({
        id: row.id,
        conversationId: row.conversationId,
        direction: "INBOUND",
        authorType: "CUSTOMER",
        authorName: "Cliente",
        body: row.body?.trim() || (row.mediaCount > 0 ? `Archivo recibido (${row.mediaCount})` : "Mensaje sin texto"),
        messageType: "TEXT",
        status: "RECEIVED",
        occurredAt: row.receivedAt,
        quote: null,
        fileAssetId: null,
      })),
      ...outbound.map((row): WhatsAppInboxMessage => ({
        id: row.id,
        conversationId: row.conversationId,
        direction: "OUTBOUND",
        authorType: row.authorType,
        authorName: row.authorType === "AI"
          ? "Asistente Tuvansa"
          : row.sentByUser
            ? `${row.sentByUser.firstName} ${row.sentByUser.lastName}`.trim()
            : "Tuvansa",
        body: row.body,
        messageType: row.messageType,
        status: row.status,
        occurredAt: row.sentAt,
        quote: row.quote ? {
          id: row.quote.id,
          quoteNumber: row.quote.quoteNumber,
          status: row.quote.status,
        } : null,
        fileAssetId: row.fileAssetId,
      })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const hasMore = inbound.length > input.pageSize
      || outbound.length > input.pageSize
      || messages.length > input.pageSize;
    const selected = messages.slice(0, input.pageSize).reverse();
    return {
      items: selected,
      hasMore,
      nextCursor: hasMore && selected.length > 0
        ? this.encodeMessageCursor(selected[0].occurredAt)
        : null,
    };
  }

  async markRead(conversationId: string, actor: WhatsAppInboxActor, readAt: Date): Promise<boolean> {
    const allowed = await prisma.whatsAppConversation.findFirst({
      where: { id: conversationId, ...this.visibilityWhere(actor) },
      select: { id: true },
    });
    if (!allowed) return false;
    await prisma.whatsAppConversationReadState.upsert({
      where: { conversationId_userId: { conversationId, userId: actor.id } },
      create: { conversationId, userId: actor.id, lastReadAt: readAt },
      update: { lastReadAt: readAt },
    });
    return true;
  }

  async setMode(input: {
    conversationId: string;
    actor: WhatsAppInboxActor;
    mode: WhatsAppConversationMode;
    changedAt: Date;
  }): Promise<WhatsAppInboxConversation | null> {
    const allowed = await prisma.whatsAppConversation.findFirst({
      where: { id: input.conversationId, ...this.visibilityWhere(input.actor) },
      select: { id: true },
    });
    if (!allowed) return null;

    await prisma.$transaction(async (tx) => {
      await tx.whatsAppConversation.update({
        where: { id: input.conversationId },
        data: input.mode === "HUMAN"
          ? { mode: "HUMAN", handledByUserId: input.actor.id, handledAt: input.changedAt }
          : { mode: "AI", handledByUserId: null, handledAt: null },
      });
      if (input.mode === "HUMAN") {
        await tx.whatsAppAssistantJob.updateMany({
          where: {
            conversationId: input.conversationId,
            status: { in: ["PENDING", "PROCESSING"] },
          },
          data: {
            status: "CANCELLED",
            lockedAt: null,
            completedAt: input.changedAt,
            errorMessage: "Cancelled because a user took control of the conversation.",
          },
        });
      }
    });
    return this.findConversation({ conversationId: input.conversationId, actor: input.actor });
  }

  async recordManualMessage(input: {
    messageId: string;
    conversationId: string;
    providerMessageId: string;
    body: string;
    sentByUserId: string;
    sentAt: Date;
  }): Promise<void> {
    await prisma.$transaction([
      prisma.whatsAppOutboundMessage.create({
        data: {
          id: input.messageId,
          conversationId: input.conversationId,
          providerMessageId: input.providerMessageId,
          authorType: "USER",
          messageType: "TEXT",
          status: "QUEUED",
          body: input.body,
          sentByUserId: input.sentByUserId,
          sentAt: input.sentAt,
        },
      }),
      prisma.whatsAppConversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: input.sentAt },
      }),
    ]);
  }

  async registerQuoteDelivery(input: RegisterWhatsAppQuoteDeliveryInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const conversation = await tx.whatsAppConversation.upsert({
        where: {
          businessPhoneE164_participantPhoneE164: {
            businessPhoneE164: input.businessPhoneE164,
            participantPhoneE164: input.participantPhoneE164,
          },
        },
        create: {
          businessPhoneE164: input.businessPhoneE164,
          participantPhoneE164: input.participantPhoneE164,
          lastInboundAt: null,
          lastMessageAt: input.sentAt,
        },
        update: { lastMessageAt: input.sentAt },
        select: { id: true },
      });

      await tx.whatsAppConversationAccess.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: input.ownerUserId,
          },
        },
        create: {
          conversationId: conversation.id,
          userId: input.ownerUserId,
          branchId: input.branchId,
          customerId: input.customerId,
          customerContactId: input.customerContactId,
          quoteId: input.quoteId,
        },
        update: {
          branchId: input.branchId,
          customerId: input.customerId,
          customerContactId: input.customerContactId,
          quoteId: input.quoteId,
        },
      });

      const existing = await tx.whatsAppOutboundMessage.findUnique({
        where: { providerMessageId: input.providerMessageId },
        select: { id: true },
      });
      if (!existing) {
        await tx.whatsAppOutboundMessage.create({
          data: {
            conversationId: conversation.id,
            providerMessageId: input.providerMessageId,
            authorType: "USER",
            messageType: "QUOTE_DOCUMENT",
            status: input.status,
            body: input.body,
            sentByUserId: input.sentByUserId,
            quoteId: input.quoteId,
            fileAssetId: input.fileAssetId,
            sentAt: input.sentAt,
          },
        });
      }
    });
  }

  async updateOutboundStatus(input: {
    providerMessageId: string;
    status: WhatsAppOutboundMessageStatus;
    errorMessage: string | null;
    occurredAt: Date;
  }): Promise<boolean> {
    const result = await prisma.whatsAppOutboundMessage.updateMany({
      where: { providerMessageId: input.providerMessageId },
      data: {
        status: input.status,
        errorMessage: input.errorMessage,
        ...(input.status === "DELIVERED" ? { deliveredAt: input.occurredAt } : {}),
        ...(input.status === "READ" ? { readAt: input.occurredAt } : {}),
        ...(input.status === "FAILED" ? { failedAt: input.occurredAt } : {}),
      },
    });
    return result.count > 0;
  }

  private visibilityWhere(actor: WhatsAppInboxActor): Prisma.WhatsAppConversationWhereInput {
    if (actor.role === "ADMIN") return {};
    if (actor.role === "MANAGER") {
      return { accesses: { some: { branchId: actor.branchId } } };
    }
    return { accesses: { some: { userId: actor.id } } };
  }

  private toConversation(row: ConversationRow, actor: WhatsAppInboxActor): WhatsAppInboxConversation {
    const access = actor.role === "SELLER"
      ? row.accesses.find((item) => item.userId === actor.id)
      : actor.role === "MANAGER"
        ? row.accesses.find((item) => item.branchId === actor.branchId)
        : row.accesses[0];
    const inbound = row.inboundMessages[0];
    const outbound = row.outboundMessages[0];
    const latestInboundAt = inbound?.receivedAt.getTime() || 0;
    const latestOutboundAt = outbound?.sentAt.getTime() || 0;
    const lastMessage = latestInboundAt >= latestOutboundAt
      ? inbound?.body?.trim() || (inbound?.mediaCount ? "Archivo recibido" : "Mensaje recibido")
      : outbound?.body?.trim() || "Mensaje enviado";
    const readAt = row.readStates.find((state) => state.userId === actor.id)?.lastReadAt;
    const unread = Boolean(row.lastInboundAt && (!readAt || row.lastInboundAt > readAt));
    const customerName = access?.customer?.legalName?.trim()
      || access?.customer?.displayName?.trim()
      || access?.customerContact?.name?.trim()
      || row.participantPhoneE164;

    return {
      id: row.id,
      participantPhone: row.participantPhoneE164,
      customerId: access?.customer?.id ?? null,
      customerName,
      contactId: access?.customerContact?.id ?? null,
      contactName: access?.customerContact?.name ?? null,
      sellerName: access?.user
        ? `${access.user.firstName} ${access.user.lastName}`.trim()
        : null,
      quote: access?.quote ? {
        id: access.quote.id,
        quoteNumber: access.quote.quoteNumber,
        status: access.quote.status,
      } : null,
      mode: row.mode,
      handledByName: row.handledByUser
        ? `${row.handledByUser.firstName} ${row.handledByUser.lastName}`.trim()
        : null,
      lastMessage,
      lastMessageAt: row.lastMessageAt,
      lastInboundAt: row.lastInboundAt,
      unreadCount: unread ? 1 : 0,
    };
  }

  private encodeCursor(at: Date, id: string): string {
    return Buffer.from(JSON.stringify({ at: at.toISOString(), id }), "utf8").toString("base64url");
  }

  private decodeCursor(value?: string): { at: Date; id: string } | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { at?: unknown; id?: unknown };
      const at = new Date(String(parsed.at || ""));
      const id = typeof parsed.id === "string" ? parsed.id : "";
      return Number.isNaN(at.getTime()) || !id ? null : { at, id };
    } catch {
      return null;
    }
  }

  private encodeMessageCursor(at: Date): string {
    return Buffer.from(at.toISOString(), "utf8").toString("base64url");
  }

  private decodeMessageCursor(value?: string): Date | null {
    if (!value) return null;
    try {
      const date = new Date(Buffer.from(value, "base64url").toString("utf8"));
      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
}
