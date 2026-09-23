export type WhatsAppInternalAlertType =
  | "CUSTOMER_ONBOARDING_PENDING"
  | "CUSTOMER_ONBOARDING_CORRECTION"
  | "CUSTOMER_ONBOARDING_ERP_LINKED"
  | "LEAD_ASSIGNED"
  | "INFORMATION_REQUESTED"
  | "QUOTE_CHANGE_REQUESTED"
  | "QUOTE_ACCEPTED"
  | "QUOTE_REJECTED"
  | "FILE_REVIEW_REQUIRED";

export interface WhatsAppInternalAlertRecipient {
  id: string;
  name: string;
  whatsappPhoneE164: string | null;
  isActive: boolean;
}

export interface WhatsAppInternalAlertInput {
  eventKey: string;
  type: WhatsAppInternalAlertType;
  recipientUserId?: string | null;
  conversationId?: string | null;
  quoteId?: string | null;
  customerName?: string | null;
  reference: string;
  detail: string;
}
