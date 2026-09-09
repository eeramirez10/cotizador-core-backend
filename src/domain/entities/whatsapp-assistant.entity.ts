export interface WhatsAppAssistantJobEntity {
  id: string;
  conversationId: string;
  participantPhone: string;
  message: string;
  mediaCount: number;
  previousResponseId: string | null;
  attempts: number;
}

export interface WhatsAppAssistantQuoteSummary {
  id: string;
  quoteNumber: string;
  status: string;
  currency: string;
  total: number;
  validUntil: Date;
  sentAt: Date;
  sellerName: string;
  itemDescriptions: string[];
}

export interface WhatsAppAssistantQuoteDetails extends WhatsAppAssistantQuoteSummary {
  subtotal: number;
  tax: number;
  deliveryPlace: string | null;
  paymentTerms: string;
  revisionNumber: number;
  orderStatus: string;
  contactId: string | null;
  sellerId: string;
  branchId: string;
}

export type WhatsAppAssistantActionType = "ACCEPT_QUOTE" | "REJECT_QUOTE";

export interface WhatsAppPendingActionEntity {
  id: string;
  quoteId: string;
  quoteNumber: string;
  actionType: WhatsAppAssistantActionType;
  payload: Record<string, unknown>;
  expiresAt: Date;
}

export interface WhatsAppCustomerChangeRequestEntity {
  id: string;
  quoteId: string;
  requestedByPhone: string;
  requestedChanges: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
}
