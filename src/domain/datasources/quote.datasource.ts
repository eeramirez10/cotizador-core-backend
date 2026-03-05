import type {
  Currency,
  QuoteOrigin,
  QuoteStatus,
  UserRole,
} from "../../infrastructure/database/generated/enums";
import { QuoteEntity } from "../entities/quote.entity";

export interface QuoteAccessScope {
  role: UserRole;
  branchId: string;
}

export interface FindQuotesDatasourceParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: QuoteStatus;
  branchId?: string;
  scope: QuoteAccessScope;
}

export interface FindQuotesDatasourceResult {
  items: QuoteEntity[];
  total: number;
}

export interface CreateQuoteDatasourceParams {
  quoteNumber: string;
  origin: QuoteOrigin;
  currency: Currency;
  exchangeRate: number;
  exchangeRateDate: Date;
  taxRate: number;
  branchId: string;
  customerId: string;
  createdByUserId: string;
  updatedByUserId: string;
  notes: string | null;
}

export interface UpdateQuoteDatasourceData {
  customerId?: string;
  origin?: QuoteOrigin;
  currency?: Currency;
  exchangeRate?: number;
  exchangeRateDate?: Date;
  taxRate?: number;
  notes?: string | null;
  updatedByUserId: string;
}

export interface FindQuoteByIdDatasourceParams {
  id: string;
  scope: QuoteAccessScope;
}

export interface UpdateQuoteByIdDatasourceParams {
  id: string;
  data: UpdateQuoteDatasourceData;
  scope: QuoteAccessScope;
}

export interface AddQuoteItemDatasourceParams {
  quoteId: string;
  data: {
    productId: string | null;
    externalProductCode: string | null;
    ean: string | null;
    customerDescription: string | null;
    customerUnit: string | null;
    erpDescription: string | null;
    unit: string;
    qty: number;
    stock: number | null;
    deliveryTime: string | null;
    cost: number;
    costCurrency: Currency;
    marginPct: number;
    unitPrice: number;
    subtotal: number;
    sourceRequiresReview: boolean;
    requiresReview: boolean;
    updatedByUserId: string;
  };
  scope: QuoteAccessScope;
}

export interface UpdateQuoteItemDatasourceParams {
  quoteId: string;
  itemId: string;
  data: {
    productId?: string | null;
    externalProductCode?: string | null;
    ean?: string | null;
    customerDescription?: string | null;
    customerUnit?: string | null;
    erpDescription?: string | null;
    unit?: string;
    qty?: number;
    stock?: number | null;
    deliveryTime?: string | null;
    cost?: number;
    costCurrency?: Currency;
    marginPct?: number;
    unitPrice?: number;
    subtotal?: number;
    sourceRequiresReview?: boolean;
    requiresReview?: boolean;
    updatedByUserId: string;
  };
  scope: QuoteAccessScope;
}

export interface RemoveQuoteItemDatasourceParams {
  quoteId: string;
  itemId: string;
  updatedByUserId: string;
  scope: QuoteAccessScope;
}

export interface ChangeQuoteStatusDatasourceParams {
  id: string;
  status: QuoteStatus;
  note: string | null;
  actorUserId: string;
  scope: QuoteAccessScope;
}

export abstract class QuoteDatasource {
  abstract findPaginated(params: FindQuotesDatasourceParams): Promise<FindQuotesDatasourceResult>;
  abstract findById(params: FindQuoteByIdDatasourceParams): Promise<QuoteEntity | null>;
  abstract createDraft(params: CreateQuoteDatasourceParams): Promise<QuoteEntity>;
  abstract updateById(params: UpdateQuoteByIdDatasourceParams): Promise<QuoteEntity | null>;
  abstract addItem(params: AddQuoteItemDatasourceParams): Promise<QuoteEntity | null>;
  abstract updateItem(params: UpdateQuoteItemDatasourceParams): Promise<QuoteEntity | null>;
  abstract removeItem(params: RemoveQuoteItemDatasourceParams): Promise<QuoteEntity | null>;
  abstract changeStatus(params: ChangeQuoteStatusDatasourceParams): Promise<QuoteEntity | null>;
}
