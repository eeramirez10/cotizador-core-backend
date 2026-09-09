export interface WhatsAppConversationEntity {
  businessPhoneE164: string;
  participantPhoneE164: string;
  lastInboundAt: Date | null;
}

export interface RecordWhatsAppInboundMessageInput {
  businessPhoneE164: string;
  participantPhoneE164: string;
  providerMessageId: string;
  body: string | null;
  mediaCount: number;
  receivedAt: Date;
  enqueueAssistant?: boolean;
}

export interface RecordedWhatsAppInboundMessage {
  conversationId: string;
  inboundMessageId: string;
  created: boolean;
}
