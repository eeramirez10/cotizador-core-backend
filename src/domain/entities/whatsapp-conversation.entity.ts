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
  media: WhatsAppInboundMediaReference[];
  receivedAt: Date;
  enqueueAssistant?: boolean;
  participantType: WhatsAppAssistantAudience;
  internalUserId: string | null;
  internalUserBranchId: string | null;
  principalResolvedAt: Date;
}

export interface RecordedWhatsAppInboundMessage {
  conversationId: string;
  inboundMessageId: string;
  created: boolean;
}
