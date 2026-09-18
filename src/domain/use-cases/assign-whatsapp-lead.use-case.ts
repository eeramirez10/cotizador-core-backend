import type { WhatsAppAssistantMessagingPort } from "../contracts/whatsapp-assistant-messaging.port";
import type { WhatsAppInboxActor, WhatsAppInboxConversation } from "../entities/whatsapp-inbox.entity";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";
import type { WhatsAppLeadRepository } from "../repositories/whatsapp-lead.repository";
import type { SendWhatsAppInternalAlertUseCase } from "./send-whatsapp-internal-alert.use-case";

export class AssignWhatsAppLeadUseCase {
  constructor(
    private readonly leads: WhatsAppLeadRepository,
    private readonly inbox: WhatsAppInboxRepository,
    private readonly realtime?: WhatsAppRealtimePublisher,
    private readonly now: () => Date = () => new Date(),
    private readonly messaging?: WhatsAppAssistantMessagingPort,
    private readonly internalAlerts?: SendWhatsAppInternalAlertUseCase,
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
    await this.sendAssignmentNotice(conversation, assignedAt);
    await this.sendSellerAlert(conversation, assignedAt);
    return conversation;
  }

  private async sendSellerAlert(conversation: WhatsAppInboxConversation, assignedAt: Date): Promise<void> {
    const sellerId = conversation.lead?.assignedSellerId;
    if (!this.internalAlerts || !sellerId) return;
    const customerName = conversation.lead?.companyName?.trim()
      || conversation.lead?.contactName?.trim()
      || conversation.customerName?.trim()
      || conversation.contactName?.trim()
      || "Nuevo prospecto";
    await this.internalAlerts.execute({
      eventKey: `lead-assigned:${conversation.id}:${sellerId}:${assignedAt.toISOString()}`,
      type: "LEAD_ASSIGNED",
      recipientUserId: sellerId,
      conversationId: conversation.id,
      customerName,
      reference: conversation.participantPhone,
      detail: conversation.lead?.requestSummary?.trim() || "Da seguimiento a la nueva solicitud recibida por WhatsApp.",
    });
  }

  private async sendAssignmentNotice(
    conversation: WhatsAppInboxConversation,
    sentAt: Date,
  ): Promise<void> {
    const sellerName = conversation.lead?.assignedSellerName?.trim() || conversation.sellerName?.trim();
    if (!this.messaging || !sellerName) return;

    const contactName = conversation.lead?.contactName?.trim() || conversation.contactName?.trim();
    const greeting = contactName ? `Hola ${contactName}. ` : "Hola. ";
    const body = `${greeting}Tu solicitud fue asignada a ${sellerName}, del área de ventas de Tubería y Válvulas del Norte. Te contactará para dar seguimiento a tu cotización.`;

    try {
      const delivery = await this.messaging.sendReply(conversation.participantPhone, body);
      const message = await this.inbox.recordSystemMessage({
        conversationId: conversation.id,
        providerMessageId: delivery.providerMessageId,
        body,
        sentAt,
      });
      void this.realtime?.publish({
        type: "WHATSAPP_CONVERSATION_CHANGED",
        conversationId: conversation.id,
        reason: "MESSAGE_SENT",
        occurredAt: sentAt.toISOString(),
        message: {
          ...message,
          occurredAt: message.occurredAt.toISOString(),
          attachments: [],
        },
        conversation: {
          lastMessage: body,
          lastMessageAt: sentAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("whatsapp_lead_assignment_notice_failed", {
        conversationId: conversation.id,
        sellerId: conversation.lead?.assignedSellerId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
