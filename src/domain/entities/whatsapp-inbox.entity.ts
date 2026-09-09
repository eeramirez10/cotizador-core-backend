import type {
  UserRole,
  WhatsAppConversationMode,
  WhatsAppOutboundMessageStatus,
} from "../../infrastructure/database/generated/enums";

export interface WhatsAppInboxActor {
  id: string;
  role: UserRole;
  branchId: string;
}

export interface WhatsAppInboxQuoteContext {
  id: string;
  quoteNumber: string;
  status: string;
}

export interface WhatsAppInboxConversation {
  id: string;
  participantPhone: string;
  customerId: string | null;
  customerName: string;
  contactId: string | null;
  contactName: string | null;
  sellerName: string | null;
  quote: WhatsAppInboxQuoteContext | null;
  mode: WhatsAppConversationMode;
  handledByName: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  lastInboundAt: Date | null;
  unreadCount: number;
}

export interface WhatsAppInboxMessage {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  authorType: "CUSTOMER" | "AI" | "USER" | "SYSTEM";
  authorName: string;
  body: string;
  messageType: "TEXT" | "QUOTE_DOCUMENT";
  status: WhatsAppOutboundMessageStatus | "RECEIVED";
  occurredAt: Date;
  quote: WhatsAppInboxQuoteContext | null;
  fileAssetId: string | null;
}

export interface WhatsAppInboxConversationPage {
  items: WhatsAppInboxConversation[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface WhatsAppInboxMessagePage {
  items: WhatsAppInboxMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface RegisterWhatsAppQuoteDeliveryInput {
  businessPhoneE164: string;
  participantPhoneE164: string;
  providerMessageId: string;
  status: WhatsAppOutboundMessageStatus;
  body: string;
  sentAt: Date;
  sentByUserId: string;
  ownerUserId: string;
  branchId: string;
  customerId: string;
  customerContactId: string | null;
  quoteId: string;
  fileAssetId: string;
}
