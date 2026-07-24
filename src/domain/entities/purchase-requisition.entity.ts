import type {
  Currency,
  PurchaseCostSource,
  PurchaseItemSource,
  PurchaseRequisitionItemStatus,
  PurchaseRequisitionStatus,
  SupplierScope,
  SupplierSource,
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
  scope: SupplierScope;
  taxId: string | null;
  state: string | null;
  creditTerms: string | null;
  currency: Currency | null;
  country: string | null;
  contactName: string | null;
  contactPosition: string | null;
  email: string | null;
  phone: string | null;
  phoneExtension: string | null;
  mobile: string | null;
  notes: string | null;
  erpSyncedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseSupplierOfferEntity {
  id: string;
  requisitionItemId: string;
  supplierId: string;
  qty: number;
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
  validUntil: Date | null;
  quoteDate: Date;
  sentAt: Date | null;
  externalReference: string | null;
  notes: string | null;
  isSelected: boolean;
  isActive: boolean;
  supplier: SupplierEntity;
  createdBy: ProcurementUserSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseRequisitionItemEntity {
  id: string;
  quoteItemId: string;
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
