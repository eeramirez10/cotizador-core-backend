import type { WhatsAppInboxActor, WhatsAppInboxConversation } from "../entities/whatsapp-inbox.entity";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";
import type { WhatsAppLeadRepository } from "../repositories/whatsapp-lead.repository";

export class AssignWhatsAppLeadUseCase {
  constructor(
    private readonly leads: WhatsAppLeadRepository,
    private readonly inbox: WhatsAppInboxRepository,
    private readonly realtime?: WhatsAppRealtimePublisher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    conversationId: string,
    sellerId: string,
    actor: WhatsAppInboxActor,
  ): Promise<WhatsAppInboxConversation> {
    if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
      throw new Error("Only ADMIN or MANAGER can assign WhatsApp leads.");
    }
    const assignedAt = this.now();
    await this.leads.assign({ conversationId, sellerId, actor, assignedAt });
    const conversation = await this.inbox.findConversation({ conversationId, actor });
    if (!conversation) throw new Error("Conversación no encontrada.");
    void this.realtime?.publish({
      type: "WHATSAPP_CONVERSATION_CHANGED",
      conversationId,
      reason: "LEAD_ASSIGNED",
      occurredAt: assignedAt.toISOString(),
      conversation: {
        sellerName: conversation.sellerName,
        lead: conversation.lead,
      },
    });
    return conversation;
  }
}
