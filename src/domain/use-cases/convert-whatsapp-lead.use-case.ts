import type { WhatsAppInboxActor, WhatsAppInboxConversation } from "../entities/whatsapp-inbox.entity";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";
import type { WhatsAppLeadRepository } from "../repositories/whatsapp-lead.repository";

export class ConvertWhatsAppLeadUseCase {
  constructor(
    private readonly leads: WhatsAppLeadRepository,
    private readonly inbox: WhatsAppInboxRepository,
    private readonly realtime?: WhatsAppRealtimePublisher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    conversationId: string;
    customerId: string;
    customerContactId: string | null;
    actor: WhatsAppInboxActor;
  }): Promise<WhatsAppInboxConversation> {
    if (input.actor.role === "PURCHASING") {
      throw new Error("PURCHASING cannot convert WhatsApp leads.");
    }
    const convertedAt = this.now();
    await this.leads.convert({
      conversationId: input.conversationId,
      customerId: input.customerId,
      customerContactId: input.customerContactId,
      actor: input.actor,
      convertedAt,
    });
    const conversation = await this.inbox.findConversation({
      conversationId: input.conversationId,
      actor: input.actor,
    });
    if (!conversation) throw new Error("Conversación no encontrada.");
    void this.realtime?.publish({
      type: "WHATSAPP_CONVERSATION_CHANGED",
      conversationId: input.conversationId,
      reason: "LEAD_CONVERTED",
      occurredAt: convertedAt.toISOString(),
      conversation: {
        customerName: conversation.customerName,
        contactName: conversation.contactName,
        sellerName: conversation.sellerName,
        lead: conversation.lead,
      },
    });
    return conversation;
  }
}
