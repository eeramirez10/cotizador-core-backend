export type WhatsAppRealtimeEventReason =
  | "MESSAGE_RECEIVED"
  | "MESSAGE_SENT"
  | "MESSAGE_STATUS_CHANGED"
  | "CONVERSATION_MODE_CHANGED"
  | "LEAD_UPDATED"
  | "LEAD_ASSIGNED"
  | "LEAD_CONVERTED"
  | "QUOTE_SENT";

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
  handledByName?: string | null;
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
}

export interface WhatsAppRealtimeEvent {
  type: "WHATSAPP_CONVERSATION_CHANGED";
  conversationId: string;
  reason: WhatsAppRealtimeEventReason;
  occurredAt: string;
  message?: WhatsAppRealtimeMessagePayload;
  messagePatch?: WhatsAppRealtimeMessagePatch;
  conversation?: WhatsAppRealtimeConversationPatch;
}

export abstract class WhatsAppRealtimePublisher {
  abstract publish(event: WhatsAppRealtimeEvent): Promise<void>;
}
