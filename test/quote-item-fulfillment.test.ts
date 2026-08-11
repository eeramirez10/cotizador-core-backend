import assert from "node:assert/strict";
import test from "node:test";
import { getQuoteItemEffectiveUnitCost } from "../src/domain/use-cases/quote-item-fulfillment.helper";

const erpItem = {
  qty: 1,
  stock: 1,
  externalProductCode: "01300001",
  cost: 4_600,
  // Simulates a legacy payload where the ERP sale currency was stored here.
  costCurrency: "USD" as const,
  sellerQuotedUnitCost: null,
  sellerQuotedCurrency: null,
  sellerQuotedExchangeRate: null,
};

test("ERP costs remain in MXN regardless of the ERP sale currency", () => {
  assert.equal(getQuoteItemEffectiveUnitCost(erpItem, "MXN", 17.25), 4_600);
});

test("ERP costs convert from MXN when the quote is in USD", () => {
  const result = getQuoteItemEffectiveUnitCost(erpItem, "USD", 17.25);
  assert.ok(Math.abs(result - (4_600 / 17.25)) < 0.000001);
});

test("non-ERP costs continue using their actual cost currency", () => {
  const result = getQuoteItemEffectiveUnitCost(
    { ...erpItem, externalProductCode: null, cost: 100 },
    "MXN",
    17.25,
  );
  assert.equal(result, 1_725);
});
