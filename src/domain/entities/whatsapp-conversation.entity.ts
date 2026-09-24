import type { WhatsAppAssistantAudience } from "./whatsapp-assistant.entity";
import type { WhatsAppInboundMediaReference } from "./whatsapp-inbound-attachment.entity";

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
  hasUnsupportedAudio: boolean;
  media: WhatsAppInboundMediaReference[];
  receivedAt: Date;
  enqueueAssistant?: boolean;
  participantType: WhatsAppAssistantAudience;
  internalUserId: string | null;
  internalUserBranchId: string | null;
  customerId: string | null;
  customerContactId: string | null;
  customerOwnerUserId: string | null;
  customerOwnerBranchId: string | null;
  customerQuoteId: string | null;
  customerName: string | null;
  customerContactName: string | null;
  principalResolvedAt: Date;
  humanResponseGraceMs: number;
  humanControlMaxDurationMs: number;
}

export interface RecordedWhatsAppInboundMessage {
  conversationId: string;
  inboundMessageId: string;
  created: boolean;
  humanControlExpiresAt: Date | null;
}
