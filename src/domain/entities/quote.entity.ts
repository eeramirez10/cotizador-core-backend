import type {
  Currency,
  OrderGenerationStatus,
  QuoteDeliveryStatus,
  QuoteOrigin,
  QuoteCaptureMethod,
  QuoteSourceChannel,
  QuoteCancellationReason,
  QuoteRejectionReason,
  QuoteApprovalReturnReason,
  QuoteRevisionReason,
  QuoteStatus,
} from "../../infrastructure/database/generated/enums";
import { QuoteEventEntity } from "./quote-event.entity";
import { QuoteItemEntity } from "./quote-item.entity";

export interface QuoteBranchSummary {
  id: string;
  code: string;
  name: string;
}

export interface QuoteCustomerSummary {
  id: string;
  displayName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string;
}

export interface QuoteUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  branchId: string;
  branchCode: string;
  branchName: string;
}

export interface QuoteRevisionSummary {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  revisionNumber: number;
}

export interface QuoteEntity {
  id: string;
  quoteNumber: string;
  clientDraftId: string | null;
  status: QuoteStatus;
  deliveryStatus: QuoteDeliveryStatus;
  firstSentAt: Date | null;
  orderStatus: OrderGenerationStatus;
  orderGeneratedAt: Date | null;
  orderReference: string | null;
  origin: QuoteOrigin;
  captureMethod: QuoteCaptureMethod;
  originalQuoteDate: Date | null;
  sourceChannel: QuoteSourceChannel;
  currency: Currency;
  exchangeRate: number;
  exchangeRateDate: Date;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  deliveryPlace: string | null;
  paymentTerms: string;
  validityDays: number;
  validUntil: Date;
  branchId: string;
  customerId: string;
  createdByUserId: string;
  updatedByUserId: string | null;
  providedByUserId: string | null;
  providedByNameSnapshot: string | null;
  providedByBranchNameSnapshot: string | null;
  providedAt: Date | null;
  providedByAssignedByUserId: string | null;
  rejectionReason: QuoteRejectionReason | null;
  rejectionComment: string | null;
  rejectedAt: Date | null;
  rejectedByUserId: string | null;
  cancellationReason: QuoteCancellationReason | null;
  cancellationComment: string | null;
  cancelledAt: Date | null;
  cancelledByUserId: string | null;
  approvalReturnReason: QuoteApprovalReturnReason | null;
  approvalReturnComment: string | null;
  rootQuoteId: string | null;
  previousVersionId: string | null;
  supersededByQuoteId: string | null;
  revisionNumber: number;
  revisionReason: QuoteRevisionReason | null;
  revisionComment: string | null;
  supersededAt: Date | null;
  archivedAt: Date | null;
  archivedByUserId: string | null;
  archiveReason: string | null;
  nextRevision: QuoteRevisionSummary | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch: QuoteBranchSummary;
  customer: QuoteCustomerSummary;
  createdByUser: QuoteUserSummary;
  updatedByUser: QuoteUserSummary | null;
  rejectedByUser: QuoteUserSummary | null;
  cancelledByUser: QuoteUserSummary | null;
  archivedByUser: QuoteUserSummary | null;
  items: QuoteItemEntity[];
  events: QuoteEventEntity[];
}
