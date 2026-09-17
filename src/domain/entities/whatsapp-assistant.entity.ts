import type { ManagerReportRange, ManagerReportScope, UserRole } from "../../infrastructure/database/generated/enums";

export type WhatsAppAssistantAudience = "CUSTOMER" | "INTERNAL_USER" | "UNKNOWN";

export interface WhatsAppAssistantPrincipal {
  audience: WhatsAppAssistantAudience;
  displayName: string;
  phoneE164: string;
  userId: string | null;
  role: UserRole | null;
  branchId: string | null;
  branchName: string | null;
  reportScope: ManagerReportScope | null;
  reportBranchId: string | null;
  reportRange: ManagerReportRange | null;
  isVerified: boolean;
}

export interface WhatsAppAssistantJobEntity {
  id: string;
  conversationId: string;
  participantPhone: string;
  message: string;
  mediaCount: number;
  attachments: Array<{
    originalName: string;
    mimeType: string;
  }>;
  previousResponseId: string | null;
  attempts: number;
  principal: WhatsAppAssistantPrincipal;
}

export interface WhatsAppInternalQuoteSummary {
  id: string;
  quoteNumber: string;
  status: string;
  currency: string;
  total: number;
  customerName: string;
  sellerName: string;
  branchName: string;
  createdAt: Date;
  validUntil: Date;
}

export interface WhatsAppInternalQuoteDetails extends WhatsAppInternalQuoteSummary {
  subtotal: number;
  tax: number;
  deliveryPlace: string | null;
  paymentTerms: string;
  orderStatus: string;
  revisionNumber: number;
  itemDescriptions: string[];
}

export interface WhatsAppInternalVerificationState {
  userId: string;
  phoneE164: string;
  verificationRequestedAt: Date | null;
  verifiedAt: Date | null;
  verifiedUntil: Date | null;
  failedAttempts: number;
}

export interface WhatsAppInternalQuoteScope {
  type: "GLOBAL" | "BRANCH" | "USER";
  id: string;
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
