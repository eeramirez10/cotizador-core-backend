import type { WhatsAppLeadStatus } from "../../infrastructure/database/generated/enums";

export interface WhatsAppLeadEntity {
  id: string;
  conversationId: string;
  phoneE164: string;
  contactName: string | null;
  companyName: string | null;
  email: string | null;
  location: string | null;
  requestSummary: string | null;
  status: WhatsAppLeadStatus;
  assignedSellerId: string | null;
  assignedSellerName: string | null;
  assignedBranchId: string | null;
  assignedBranchName: string | null;
  assignedAt: Date | null;
  customerId: string | null;
  convertedByUserId: string | null;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppLeadProfilePatch {
  contactName?: string;
  companyName?: string;
  email?: string;
  location?: string;
  requestSummary?: string;
}
