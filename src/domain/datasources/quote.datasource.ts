import type {
  Currency,
  QuoteDeliveryAttemptStatus,
  QuoteDeliveryChannel,
  QuoteOrigin,
  QuoteCaptureMethod,
  QuoteSourceChannel,
  QuoteStatus,
  UserRole,
} from "../../infrastructure/database/generated/enums";
import { QuoteEntity } from "../entities/quote.entity";

export interface QuoteAccessScope {
  role: UserRole;
  userId: string;
  branchId: string;
}

export interface FindQuotesDatasourceParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: QuoteStatus;
  branchId?: string;
  archived?: boolean;
  scope: QuoteAccessScope;
}

export interface FindQuotesDatasourceResult {
  items: Array<{
    current: QuoteEntity;
    relatedVersions: QuoteEntity[];
  }>;
  total: number;
}

export interface CreateQuoteDatasourceParams {
  quoteNumber: string;
  origin: QuoteOrigin;
  captureMethod: QuoteCaptureMethod;
  originalQuoteDate: Date | null;
  sourceChannel: QuoteSourceChannel;
  currency: Currency;
  exchangeRate: number;
  exchangeRateDate: Date;
  taxRate: number;
  deliveryPlace: string | null;
  paymentTerms: string;
  commercialConditions?: string | null;
  validityDays: number;
  branchId: string;
  customerId: string;
  createdByUserId: string;
  updatedByUserId: string;
  providedByUserId: string | null;
  providedByNameSnapshot: string | null;
  providedByBranchNameSnapshot: string | null;
  providedAt: Date | null;
  providedByAssignedByUserId: string | null;
  notes: string | null;
}

export interface SaveQuoteDraftItemDatasourceData {
  clientItemId: string;
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
  itemComment: string | null;
  sellerSupplierId: string | null;
  sellerSupplierNameSnapshot: string | null;
  sellerQuotedUnitCost: number | null;
  sellerQuotedCurrency: Currency | null;
  sellerQuotedBrand: string | null;
  sellerOriginRestrictions: string[];
  sellerDeliveryState: string | null;
  sellerSupplierDeliveryTime: string | null;
  purchaseStandard: string | null;
  purchaseDiameter: string | null;
  purchaseThickness: string | null;
  purchaseBore: string | null;
  cost: number;
  costCurrency: Currency;
  marginPct: number;
  sourceCurrency: Currency | null;
  sourceUnitPrice: number | null;
  sourceSubtotal: number | null;
  unitPrice: number;
  subtotal: number;
  sourceRequiresReview: boolean;
  requiresReview: boolean;
}

export interface SaveQuoteDraftDatasourceParams {
  clientDraftId: string;
  quoteId: string | null;
  quoteNumber: string;
  action: "SAVE_DRAFT" | "SUBMIT_FOR_APPROVAL";
  submissionStatus: "PENDING_APPROVAL" | "QUOTED";
  data: Omit<CreateQuoteDatasourceParams, "quoteNumber">;
  items: SaveQuoteDraftItemDatasourceData[];
  scope: QuoteAccessScope;
}

export interface SaveQuoteDraftDatasourceResult {
  id: string;
  quoteNumber: string;
  clientDraftId: string;
  status: QuoteStatus;
}

export interface UpdateQuoteDatasourceData {
  customerId?: string;
  origin?: QuoteOrigin;
  captureMethod?: QuoteCaptureMethod;
  originalQuoteDate?: Date | null;
  sourceChannel?: QuoteSourceChannel;
  currency?: Currency;
  exchangeRate?: number;
  exchangeRateDate?: Date;
  taxRate?: number;
  deliveryPlace?: string | null;
  paymentTerms?: string;
  commercialConditions?: string | null;
  validityDays?: number;
  notes?: string | null;
  providedByUserId?: string | null;
  providedByNameSnapshot?: string | null;
  providedByBranchNameSnapshot?: string | null;
  providedAt?: Date | null;
  providedByAssignedByUserId?: string | null;
  providerAttributionEventNote?: string;
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
    itemComment: string | null;
    sellerSupplierId: string | null;
    sellerSupplierNameSnapshot: string | null;
    sellerQuotedUnitCost: number | null;
    sellerQuotedCurrency: Currency | null;
    sellerQuotedBrand: string | null;
    sellerOriginRestrictions: string[];
    sellerDeliveryState: string | null;
    sellerSupplierDeliveryTime: string | null;
    purchaseStandard: string | null;
    purchaseDiameter: string | null;
    purchaseThickness: string | null;
    purchaseBore: string | null;
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
    itemComment?: string | null;
    sellerSupplierId?: string | null;
    sellerSupplierNameSnapshot?: string | null;
    sellerQuotedUnitCost?: number | null;
    sellerQuotedCurrency?: Currency | null;
    sellerQuotedBrand?: string | null;
    sellerOriginRestrictions?: string[];
    sellerDeliveryState?: string | null;
    sellerSupplierDeliveryTime?: string | null;
    purchaseStandard?: string | null;
    purchaseDiameter?: string | null;
    purchaseThickness?: string | null;
    purchaseBore?: string | null;
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
  rejectionReason: string | null;
  rejectionComment: string | null;
  cancellationReason: string | null;
  cancellationComment: string | null;
  approvalReturnReason: string | null;
  approvalReturnComment: string | null;
  actorUserId: string;
  scope: QuoteAccessScope;
}

export interface CreateQuoteRevisionDatasourceParams {
  sourceQuoteId: string;
  reason: string;
  comment: string | null;
  actorUserId: string;
  scope: QuoteAccessScope;
}

export interface ArchiveQuoteDatasourceParams {
  id: string;
  actorUserId: string;
  reason: string;
}

export interface RestoreQuoteDatasourceParams {
  id: string;
  actorUserId: string;
}

export interface DeleteQuoteDatasourceParams {
  id: string;
  actorUserId: string;
  confirmation: string;
  reason: string;
}

export interface RecordQuoteDeliveryAttemptDatasourceParams {
  id: string;
  actorUserId: string;
  scope: QuoteAccessScope;
  data: {
    channel: QuoteDeliveryChannel;
    recipient: string;
    status: QuoteDeliveryAttemptStatus;
    providerMessageId: string | null;
    errorMessage: string | null;
    note: string | null;
    sentAt: Date;
  };
}

export interface MarkQuoteOrderGeneratedDatasourceParams {
  id: string;
  actorUserId: string;
  scope: QuoteAccessScope;
  data: {
    orderReference: string;
    fileName: string;
    generatedAt: Date;
    note: string | null;
  };
}

export interface RegisterErpQuoteDatasourceParams {
  id: string;
  actorUserId: string;
  erpQuoteNumber: string;
  scope: QuoteAccessScope;
}

export abstract class QuoteDatasource {
  abstract findPaginated(params: FindQuotesDatasourceParams): Promise<FindQuotesDatasourceResult>;
  abstract findById(params: FindQuoteByIdDatasourceParams): Promise<QuoteEntity | null>;
  abstract createDraft(params: CreateQuoteDatasourceParams): Promise<QuoteEntity>;
  abstract saveDraft(params: SaveQuoteDraftDatasourceParams): Promise<SaveQuoteDraftDatasourceResult>;
  abstract updateById(params: UpdateQuoteByIdDatasourceParams): Promise<QuoteEntity | null>;
  abstract addItem(params: AddQuoteItemDatasourceParams): Promise<QuoteEntity | null>;
  abstract updateItem(params: UpdateQuoteItemDatasourceParams): Promise<QuoteEntity | null>;
  abstract removeItem(params: RemoveQuoteItemDatasourceParams): Promise<QuoteEntity | null>;
  abstract changeStatus(params: ChangeQuoteStatusDatasourceParams): Promise<QuoteEntity | null>;
  abstract createRevision(params: CreateQuoteRevisionDatasourceParams): Promise<QuoteEntity>;
  abstract archive(params: ArchiveQuoteDatasourceParams): Promise<QuoteEntity | null>;
  abstract restore(params: RestoreQuoteDatasourceParams): Promise<QuoteEntity | null>;
  abstract deletePermanently(params: DeleteQuoteDatasourceParams): Promise<boolean>;
  abstract recordDeliveryAttempt(params: RecordQuoteDeliveryAttemptDatasourceParams): Promise<QuoteEntity | null>;
  abstract markOrderGenerated(params: MarkQuoteOrderGeneratedDatasourceParams): Promise<QuoteEntity | null>;
  abstract registerErpQuote(params: RegisterErpQuoteDatasourceParams): Promise<QuoteEntity | null>;
}
