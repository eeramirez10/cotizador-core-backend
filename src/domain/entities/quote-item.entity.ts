import type { Currency } from "../../infrastructure/database/generated/enums";

export interface QuoteItemProductSummary {
  id: string;
  code: string | null;
  ean: string | null;
  description: string;
  unit: string;
  currency: Currency;
}

export interface QuoteItemEntity {
  id: string;
  quoteId: string;
  clientItemId: string | null;
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
  createdAt: Date;
  updatedAt: Date;
  product: QuoteItemProductSummary | null;
}
