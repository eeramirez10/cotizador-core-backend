import type { RecordedWhatsAppInboundMessage } from "../entities/whatsapp-conversation.entity";
import type { WhatsAppConversationRepository } from "../repositories/whatsapp-conversation.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import { WhatsAppPhone } from "../utils/whatsapp-phone";

interface RecordInboundWhatsAppMessageInput {
  from: string;
  to: string;
  providerMessageId: string;
  body?: string;
  mediaCount?: number;
}

export class RecordInboundWhatsAppMessageUseCase {
  constructor(
    private readonly repository: WhatsAppConversationRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly assistantEnabled = false,
    private readonly realtime?: WhatsAppRealtimePublisher,
  ) {}

  async execute(input: RecordInboundWhatsAppMessageInput): Promise<RecordedWhatsAppInboundMessage> {
    const participant = WhatsAppPhone.create(input.from);
    if (!participant) throw new Error("Inbound WhatsApp sender is invalid.");
    const business = WhatsAppPhone.create(input.to);
    if (!business) throw new Error("Inbound WhatsApp recipient is invalid.");
    const providerMessageId = input.providerMessageId.trim();
    if (!providerMessageId || providerMessageId.length > 160) {
      throw new Error("Inbound WhatsApp message id is invalid.");
    }

    const receivedAt = this.now();
    const body = input.body?.trim() || null;
    const mediaCount = Math.max(0, Math.trunc(input.mediaCount || 0));
    const recorded = await this.repository.recordInboundMessage({
      businessPhoneE164: business.value,
      participantPhoneE164: participant.value,
      providerMessageId,
      body,
      mediaCount,
      receivedAt,
      enqueueAssistant: this.assistantEnabled,
    });
    if (recorded.created) {
      void this.realtime?.publish({
        type: "WHATSAPP_CONVERSATION_CHANGED",
        conversationId: recorded.conversationId,
        reason: "MESSAGE_RECEIVED",
        occurredAt: receivedAt.toISOString(),
        message: {
          id: recorded.inboundMessageId,
          conversationId: recorded.conversationId,
          direction: "INBOUND",
          authorType: "CUSTOMER",
          authorName: "Cliente",
          body: body || (mediaCount > 0 ? `Archivo recibido (${mediaCount})` : "Mensaje sin texto"),
          messageType: "TEXT",
          status: "RECEIVED",
          occurredAt: receivedAt.toISOString(),
          quote: null,
          fileAssetId: null,
        },
        conversation: {
          lastMessage: body || (mediaCount > 0 ? "Archivo recibido" : "Mensaje recibido"),
          lastMessageAt: receivedAt.toISOString(),
          lastInboundAt: receivedAt.toISOString(),
        },
      });
    }
    return recorded;
  }
}
