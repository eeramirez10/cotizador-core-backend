export type WhatsAppRealtimeEventReason =
  | "MESSAGE_RECEIVED"
  | "MESSAGE_SENT"
  | "MESSAGE_STATUS_CHANGED"
  | "CONVERSATION_MODE_CHANGED"
  | "LEAD_UPDATED"
  | "LEAD_ASSIGNED"
  | "LEAD_CONVERTED"
  | "QUOTE_SENT"
  | "QUOTE_ACCEPTED"
  | "QUOTE_REJECTED"
  | "QUOTE_CANCELLED"
  | "CUSTOMER_INFORMATION_REQUESTED"
  | "CUSTOMER_CHANGE_REQUESTED"
  | "CONVERSATION_DELETED"
  | "SYSTEM_NOTIFICATION_CREATED";

export interface WhatsAppRealtimeDeletionAudience {
  userIds: string[];
  branchIds: string[];
  assignedSellerId: string | null;
  assignedBranchId: string | null;
  visibleToUnassignedLeadManagers: boolean;
}

export interface QuoteCustomerDecisionRealtimePayload {
  quoteId: string;
  quoteNumber: string;
  status: "APPROVED" | "REJECTED" | "CANCELLED";
  customerName: string;
  contactName: string;
  sellerId: string;
  branchId: string;
  currency: "MXN" | "USD";
  total: number;
}

export interface QuoteCustomerRequestRealtimePayload {
  requestId: string;
  requestType: "INFORMATION" | "MODIFICATION";
  quoteId: string;
  quoteNumber: string;
  sellerId: string;
  branchId: string;
  detail: string;
}

export interface WhatsAppRealtimeMessagePayload {
  id: string;
  conversationId: string;
  direction: "INBOUND" | "OUTBOUND";
  authorType: "CUSTOMER" | "AI" | "USER" | "SYSTEM";
  authorName: string;
  body: string;
  messageType: "TEXT" | "QUOTE_DOCUMENT";
  status: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "RECEIVED";
  occurredAt: string;
  quote: { id: string; quoteNumber: string; status: string } | null;
  fileAssetId: string | null;
  attachments: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    quoteExtractedAt: string | null;
    quoteExtractionCount: number;
    quoteExtractedByUserId: string | null;
    quoteExtractedByName: string | null;
    lastQuoteDraftId: string | null;
  }>;
}

export interface WhatsAppRealtimeConversationPatch {
  mode?: "AI" | "HUMAN";
  handledByUserId?: string | null;
  handledByName?: string | null;
  humanControlExpiresAt?: string | null;
  humanLastActivityAt?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  lastInboundAt?: string | null;
  sellerName?: string | null;
  customerName?: string;
  contactName?: string | null;
  lead?: import("../entities/whatsapp-inbox.entity").WhatsAppInboxLeadContext | null;
}

export interface WhatsAppRealtimeMessagePatch {
  id: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  errorMessage?: string | null;
}

export interface WhatsAppRealtimeEvent {
  type: "WHATSAPP_CONVERSATION_CHANGED" | "QUOTE_CUSTOMER_DECISION" | "QUOTE_CUSTOMER_REQUEST" | "SYSTEM_NOTIFICATION_CREATED";
  conversationId: string;
  reason: WhatsAppRealtimeEventReason;
  occurredAt: string;
  message?: WhatsAppRealtimeMessagePayload;
  messagePatch?: WhatsAppRealtimeMessagePatch;
  conversation?: WhatsAppRealtimeConversationPatch;
  deleted?: boolean;
  audience?: WhatsAppRealtimeDeletionAudience;
  quoteDecision?: QuoteCustomerDecisionRealtimePayload;
  customerRequest?: QuoteCustomerRequestRealtimePayload;
  systemNotification?: {
    id: string;
    recipientUserId: string;
    type: "CUSTOMER_ONBOARDING_ERP_LINKED";
    title: string;
    message: string;
    targetPath: string;
  };
}

export abstract class WhatsAppRealtimePublisher {
  abstract publish(event: WhatsAppRealtimeEvent): Promise<void>;
}
