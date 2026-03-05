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
  createdAt: Date;
  updatedAt: Date;
  product: QuoteItemProductSummary | null;
}
