import type { WhatsAppConversationMode } from "../../infrastructure/database/generated/enums";
import type { WhatsAppInboxActor } from "../entities/whatsapp-inbox.entity";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";

export class WhatsAppInboxUseCase {
  constructor(
    private readonly repository: WhatsAppInboxRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly realtime?: WhatsAppRealtimePublisher,
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
    });
    if (conversation) {
      void this.realtime?.publish({
        type: "WHATSAPP_CONVERSATION_CHANGED",
        conversationId,
        reason: "CONVERSATION_MODE_CHANGED",
        occurredAt: changedAt.toISOString(),
        conversation: {
          mode: conversation.mode,
          handledByName: conversation.handledByName,
        },
      });
    }
    return conversation;
  }
}
