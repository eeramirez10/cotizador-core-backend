export interface WhatsAppConversationEntity {
  businessPhoneE164: string;
  participantPhoneE164: string;
  lastInboundAt: Date;
}

export interface RecordWhatsAppInboundMessageInput {
  businessPhoneE164: string;
  participantPhoneE164: string;
  providerMessageId: string;
  body: string | null;
  mediaCount: number;
  receivedAt: Date;
}
