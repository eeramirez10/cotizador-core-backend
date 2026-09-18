import type {
  UserRole,
  WhatsAppConversationMode,
  WhatsAppLeadStatus,
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

export interface WhatsAppInboxRelatedQuote extends WhatsAppInboxQuoteContext {
  currency: "MXN" | "USD";
  total: number;
  revisionNumber: number;
  rootQuoteId: string | null;
  previousVersionId: string | null;
  sellerName: string;
  createdAt: Date;
  updatedAt: Date;
  isCurrent: boolean;
}

export interface WhatsAppInboxLeadContext {
  id: string;
  status: WhatsAppLeadStatus;
  contactName: string | null;
  companyName: string | null;
  email: string | null;
  location: string | null;
  requestSummary: string | null;
  assignedSellerId: string | null;
  assignedSellerName: string | null;
  assignedBranchId: string | null;
  assignedBranchName: string | null;
  assignedAt: Date | null;
  customerId: string | null;
  convertedByUserId: string | null;
  convertedAt: Date | null;
}

export interface WhatsAppInboxConversation {
  id: string;
  participantType: "CUSTOMER" | "INTERNAL_USER" | "UNKNOWN";
  participantPhone: string;
  customerId: string | null;
  customerName: string;
  contactId: string | null;
  contactName: string | null;
  sellerName: string | null;
  quote: WhatsAppInboxQuoteContext | null;
  lead: WhatsAppInboxLeadContext | null;
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
  attachments: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
    quoteExtractedAt: Date | null;
    quoteExtractionCount: number;
    quoteExtractedByUserId: string | null;
    quoteExtractedByName: string | null;
    lastQuoteDraftId: string | null;
  }>;
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

export interface WhatsAppConversationDeletionRecord {
  conversationId: string;
  storageKeysToDelete: string[];
  deletedProspect: boolean;
  preservedQuoteCount: number;
  preservedQuoteFileCount: number;
  audience: {
    userIds: string[];
    branchIds: string[];
    assignedSellerId: string | null;
    assignedBranchId: string | null;
    visibleToUnassignedLeadManagers: boolean;
  };
}

export interface WhatsAppConversationDeletionResult {
  conversationId: string;
  deletedProspect: boolean;
  deletedFileCount: number;
  failedFileCount: number;
  preservedQuoteCount: number;
  preservedQuoteFileCount: number;
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
