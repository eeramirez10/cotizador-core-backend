import type {
  Currency,
  PurchaseCostSource,
  PurchaseItemSource,
  PurchaseRequisitionItemStatus,
  PurchaseRequisitionStatus,
  SupplierScope,
  SupplierSource,
  SupplierStatus,
  PurchaseOfferSource,
  SupplierContactChannel,
  SupplierPhoneKind,
} from "../../infrastructure/database/generated/enums";

export interface ProcurementUserSummary {
  id: string;
  fullName: string;
  role: string;
}

export interface SupplierEntity {
  id: string;
  erpCode: string | null;
  name: string;
  source: SupplierSource;
  status: SupplierStatus;
  scope: SupplierScope;
  taxId: string | null;
  normalizedTaxId: string | null;
  state: string | null;
  creditTerms: string | null;
  currency: Currency | null;
  country: string | null;
  contactName: string | null;
  contactPosition: string | null;
  email: string | null;
  normalizedEmail: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  phoneExtension: string | null;
  mobile: string | null;
  contacts: SupplierContactEntity[];
  notes: string | null;
  erpSyncedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierContactEntity {
  id: string;
  channel: SupplierContactChannel;
  value: string;
  normalizedValue: string;
  phoneKind: SupplierPhoneKind | null;
  extension: string | null;
  isWhatsApp: boolean;
  contactName: string | null;
  label: string | null;
  isPrimary: boolean;
}

export interface PurchaseSupplierOfferEntity {
  id: string;
  requisitionItemId: string;
  supplierQuoteId: string | null;
  supplierId: string;
  source: PurchaseOfferSource;
  supplierProductCode: string | null;
  alternateCodes: string[];
  supplierDescription: string | null;
  qty: number;
  unit: string | null;
  listUnitPrice: number | null;
  discountPct: number | null;
  unitCost: number;
  currency: Currency;
  exchangeRate: number | null;
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  brand: string | null;
  origin: string | null;
  deliveryTime: string | null;
  availableDate: Date | null;
  minimumQty: number | null;
  validUntil: Date | null;
  quoteDate: Date;
  sentAt: Date | null;
  externalReference: string | null;
  notes: string | null;
  isSelected: boolean;
  isActive: boolean;
  supplierQuote: PurchaseSupplierQuoteSummary | null;
  supplier: SupplierEntity;
  createdBy: ProcurementUserSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseSupplierQuoteSummary {
  id: string;
  reference: string | null;
  quoteDate: Date;
  validUntil: Date | null;
  currency: Currency;
  exchangeRate: number | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  subtotal: number;
  discount: number;
  freight: number;
  otherCharges: number;
  taxIncluded: boolean;
  taxRate: number;
  tax: number;
  total: number;
  notes: string | null;
  fileAssetId: string | null;
}

export interface PurchaseRequisitionItemEntity {
  id: string;
  quoteItemId: string;
  quoteClientItemId: string | null;
  position: number;
  productId: string | null;
  source: PurchaseItemSource;
  erpCode: string | null;
  erpEan: string | null;
  erpLinkedAt: Date | null;
  erpLinkedByUserId: string | null;
  qty: number;
  unit: string;
  description: string;
  standard: string | null;
  diameter: string | null;
  thickness: string | null;
  bore: string | null;
  technicalFamily: string | null;
  technicalAttributes: Record<string, string>;
  sellerUnitCost: number;
  sellerCurrency: Currency;
  sellerExchangeRate: number;
  sellerCostSource: PurchaseCostSource;
  sellerSupplierId: string | null;
  sellerSupplierName: string | null;
  sellerBrand: string | null;
  originRestrictions: string[];
  sellerDeliveryTime: string | null;
  deliveryPlace: string | null;
  status: PurchaseRequisitionItemStatus;
  selectedOfferId: string | null;
  offers: PurchaseSupplierOfferEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseRequisitionEntity {
  id: string;
  requisitionNumber: string;
  quoteId: string;
  quoteNumber: string;
  quoteCurrency: Currency;
  branchId: string;
  branchName: string;
  customerName: string;
  requestedByUserId: string;
  requestedBy: ProcurementUserSummary;
  assignedBuyerUserId: string | null;
  assignedBuyer: ProcurementUserSummary | null;
  status: PurchaseRequisitionStatus;
  deliveryState: string | null;
  deliveryPlace: string | null;
  notes: string | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  costApprovedAt: Date | null;
  costApprovedBy: ProcurementUserSummary | null;
  items: PurchaseRequisitionItemEntity[];
  createdAt: Date;
  updatedAt: Date;
}
