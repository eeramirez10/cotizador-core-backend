import type {
  RecordWhatsAppInboundMessageInput,
  RecordedWhatsAppInboundMessage,
  WhatsAppConversationEntity,
} from "../entities/whatsapp-conversation.entity";

export abstract class WhatsAppConversationRepository {
  abstract findByParticipants(
    businessPhoneE164: string,
    participantPhoneE164: string,
  ): Promise<WhatsAppConversationEntity | null>;

  abstract recordInboundMessage(input: RecordWhatsAppInboundMessageInput): Promise<RecordedWhatsAppInboundMessage>;
}
