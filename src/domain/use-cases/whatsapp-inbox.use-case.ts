import type { WhatsAppConversationMode } from "../../infrastructure/database/generated/enums";
import type { WhatsAppInboxActor } from "../entities/whatsapp-inbox.entity";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import { resolveRuntimeValue, type RuntimeValue } from "../services/runtime-value";

export class WhatsAppInboxUseCase {
  constructor(
    private readonly repository: WhatsAppInboxRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly realtime?: WhatsAppRealtimePublisher,
    private readonly humanTakeoverDurationMs: RuntimeValue<number> = 15 * 60 * 1000,
    private readonly humanTakeoverMaxDurationMs: RuntimeValue<number> = 60 * 60 * 1000,
  ) {}

  list(input: {
    actor: WhatsAppInboxActor;
    search?: string;
    cursor?: string;
    pageSize?: number;
  }) {
    return this.repository.listConversations({
      actor: input.actor,
      search: input.search?.trim() || undefined,
      cursor: input.cursor?.trim() || undefined,
      pageSize: Math.min(Math.max(input.pageSize || 30, 1), 50),
    });
  }

  get(conversationId: string, actor: WhatsAppInboxActor) {
    return this.repository.findConversation({ conversationId, actor });
  }

  messages(input: {
    conversationId: string;
    actor: WhatsAppInboxActor;
    cursor?: string;
    after?: string;
    pageSize?: number;
  }) {
    return this.repository.listMessages({
      conversationId: input.conversationId,
      actor: input.actor,
      cursor: input.cursor?.trim() || undefined,
      after: input.after ? new Date(input.after) : undefined,
      pageSize: Math.min(Math.max(input.pageSize || 50, 1), 100),
    });
  }

  quotes(conversationId: string, actor: WhatsAppInboxActor) {
    return this.repository.listRelatedQuotes({ conversationId, actor });
  }

  markRead(conversationId: string, actor: WhatsAppInboxActor) {
    return this.repository.markRead(conversationId, actor, this.now());
  }

  async changeMode(conversationId: string, actor: WhatsAppInboxActor, mode: WhatsAppConversationMode) {
    const changedAt = this.now();
    const conversation = await this.repository.setMode({
      conversationId,
      actor,
      mode,
      changedAt,
      leaseDurationMs: resolveRuntimeValue(this.humanTakeoverDurationMs),
      maxDurationMs: resolveRuntimeValue(this.humanTakeoverMaxDurationMs),
    });
    if (conversation) {
      void this.realtime?.publish({
        type: "WHATSAPP_CONVERSATION_CHANGED",
        conversationId,
        reason: "CONVERSATION_MODE_CHANGED",
        occurredAt: changedAt.toISOString(),
        conversation: {
          mode: conversation.mode,
          handledByUserId: conversation.handledByUserId,
          handledByName: conversation.handledByName,
          humanControlExpiresAt: conversation.humanControlExpiresAt?.toISOString() || null,
          humanLastActivityAt: conversation.humanLastActivityAt?.toISOString() || null,
        },
      });
    }
    return conversation;
  }
}
