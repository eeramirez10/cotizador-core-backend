import type { WhatsAppConversationMode } from "../../infrastructure/database/generated/enums";
import type { WhatsAppInboxActor } from "../entities/whatsapp-inbox.entity";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";

export class WhatsAppInboxUseCase {
  constructor(
    private readonly repository: WhatsAppInboxRepository,
    private readonly now: () => Date = () => new Date(),
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
    pageSize?: number;
  }) {
    return this.repository.listMessages({
      conversationId: input.conversationId,
      actor: input.actor,
      cursor: input.cursor?.trim() || undefined,
      pageSize: Math.min(Math.max(input.pageSize || 50, 1), 100),
    });
  }

  markRead(conversationId: string, actor: WhatsAppInboxActor) {
    return this.repository.markRead(conversationId, actor, this.now());
  }

  changeMode(conversationId: string, actor: WhatsAppInboxActor, mode: WhatsAppConversationMode) {
    return this.repository.setMode({
      conversationId,
      actor,
      mode,
      changedAt: this.now(),
    });
  }
}
