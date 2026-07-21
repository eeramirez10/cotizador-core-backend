import type {
  Currency,
  OrderGenerationStatus,
  QuoteDeliveryStatus,
  QuoteOrigin,
  QuoteCaptureMethod,
  QuoteSourceChannel,
  QuoteStatus,
} from "../../infrastructure/database/generated/enums";
import { QuoteEventEntity } from "./quote-event.entity";
import { QuoteItemEntity } from "./quote-item.entity";

export interface QuoteBranchSummary {
  id: string;
  code: string;
  name: string;
  street: string | null;
  exteriorNumber: string | null;
  interiorNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  municipality: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
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
  email?: string;
  phone?: string | null;
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
  commercialConditions: string | null;
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
  rejectionReason: string | null;
  rejectionComment: string | null;
  rejectedAt: Date | null;
  rejectedByUserId: string | null;
  cancellationReason: string | null;
  cancellationComment: string | null;
  cancelledAt: Date | null;
  cancelledByUserId: string | null;
  approvalReturnReason: string | null;
  approvalReturnComment: string | null;
  rootQuoteId: string | null;
  previousVersionId: string | null;
  supersededByQuoteId: string | null;
  revisionNumber: number;
  revisionReason: string | null;
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
