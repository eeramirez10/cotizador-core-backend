import type { Currency } from "../../infrastructure/database/generated/enums";
import { convertQuoteAmount } from "./quote-currency.helper";

interface QuoteItemFulfillmentInput {
  qty: number;
  stock: number | null;
  externalProductCode: string | null;
}

interface QuoteItemEffectiveCostInput extends QuoteItemFulfillmentInput {
  cost: number;
  costCurrency: Currency;
  sellerQuotedUnitCost: number | null;
  sellerQuotedCurrency: Currency | null;
  sellerQuotedExchangeRate: number | null;
}

interface QuoteItemEffectiveCostAuditInput extends QuoteItemEffectiveCostInput {
  unitPrice: number;
}

export interface QuoteItemFulfillment {
  requestedQty: number;
  availableQty: number;
  purchaseQty: number;
  requiresPurchase: boolean;
}

const positive = (value: number): number => Number.isFinite(value) ? Math.max(0, value) : 0;

export const getQuoteItemFulfillment = (item: QuoteItemFulfillmentInput): QuoteItemFulfillment => {
  const requestedQty = positive(item.qty);
  const hasErpProduct = Boolean(item.externalProductCode?.trim());
  const availableQty = hasErpProduct
    ? Math.min(requestedQty, positive(item.stock ?? 0))
    : 0;
  const purchaseQty = Math.max(0, requestedQty - availableQty);

  return {
    requestedQty,
    availableQty,
    purchaseQty,
    requiresPurchase: purchaseQty > 0,
  };
};

export const getQuoteItemEffectiveUnitCost = (
  item: QuoteItemEffectiveCostInput,
  quoteCurrency: Currency,
  exchangeRate: number,
): number => {
  const fulfillment = getQuoteItemFulfillment(item);
  const erpCostCurrency: Currency = item.externalProductCode?.trim() ? "MXN" : item.costCurrency;
  const erpUnitCost = positive(convertQuoteAmount(
    positive(item.cost),
    erpCostCurrency,
    quoteCurrency,
    exchangeRate,
  ));
  const supplierUnitCost = item.sellerQuotedUnitCost !== null
    && item.sellerQuotedUnitCost > 0
    && item.sellerQuotedCurrency
    ? positive(convertQuoteAmount(
        item.sellerQuotedUnitCost,
        item.sellerQuotedCurrency,
        quoteCurrency,
        item.sellerQuotedExchangeRate || exchangeRate,
      ))
    : null;

  if (fulfillment.requestedQty <= 0 || fulfillment.purchaseQty <= 0 || supplierUnitCost === null) {
    return erpUnitCost;
  }

  return (
    fulfillment.availableQty * erpUnitCost
    + fulfillment.purchaseQty * supplierUnitCost
  ) / fulfillment.requestedQty;
};

export const getQuoteItemEffectiveCostAudit = (
  item: QuoteItemEffectiveCostAuditInput,
  quoteCurrency: Currency,
  exchangeRate: number,
) => {
  const effectiveCostAtQuote = getQuoteItemEffectiveUnitCost(item, quoteCurrency, exchangeRate);
  const effectiveCostVariance = item.unitPrice - effectiveCostAtQuote;
  const effectiveCostVariancePct = effectiveCostAtQuote > 0
    ? (effectiveCostVariance / effectiveCostAtQuote) * 100
    : 0;

  return {
    effectiveCostAtQuote,
    isBelowEffectiveCost: effectiveCostVariance < -0.0001,
    effectiveCostVariance,
    effectiveCostVariancePct,
  };
};
