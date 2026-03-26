import type {
  Currency,
  OrderGenerationStatus,
  QuoteDeliveryStatus,
  QuoteOrigin,
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

export interface QuoteEntity {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  deliveryStatus: QuoteDeliveryStatus;
  firstSentAt: Date | null;
  orderStatus: OrderGenerationStatus;
  orderGeneratedAt: Date | null;
  orderReference: string | null;
  origin: QuoteOrigin;
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
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch: QuoteBranchSummary;
  customer: QuoteCustomerSummary;
  createdByUser: QuoteUserSummary;
  updatedByUser: QuoteUserSummary | null;
  items: QuoteItemEntity[];
  events: QuoteEventEntity[];
}
