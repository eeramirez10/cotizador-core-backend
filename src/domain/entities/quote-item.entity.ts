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
  customerDescriptionOriginal: string | null;
  customerDescriptionEditedAt: Date | null;
  customerDescriptionEditedByUserId: string | null;
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
  sellerQuotedExchangeRate: number | null;
  sellerQuotedBrand: string | null;
  sellerSupplierDescription: string | null;
  sellerSupplierOrigin: string | null;
  sellerSupplierQuoteValidUntil: Date | null;
  sellerSupplierQuoteReference: string | null;
  sellerSupplierQuoteNotes: string | null;
  sellerOriginRestrictions: string[];
  sellerDeliveryState: string | null;
  sellerSupplierDeliveryTime: string | null;
  purchaseStandard: string | null;
  purchaseDiameter: string | null;
  purchaseThickness: string | null;
  purchaseBore: string | null;
  technicalFamily: string | null;
  technicalAttributes: Record<string, string>;
  cost: number;
  costCurrency: Currency;
  marginPct: number;
  effectiveCostAtQuote: number;
  isBelowEffectiveCost: boolean;
  effectiveCostVariance: number;
  effectiveCostVariancePct: number;
  effectiveCostEvaluatedAt: Date | null;
  effectiveCostEvaluatedByUserId: string | null;
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
  customerDescriptionEditedByUser: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  effectiveCostEvaluatedByUser: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}
