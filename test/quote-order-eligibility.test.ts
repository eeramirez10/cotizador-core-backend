import assert from "node:assert/strict";
import test from "node:test";
import type { QuoteItemEntity } from "../src/domain/entities/quote-item.entity";
import { evaluateQuoteOrderItems, getOrderItemErpCode, isCustomerEligibleForOrderFile } from "../src/domain/use-cases/quote-order-eligibility";

const item = (externalProductCode: string | null, stock: number | null, qty = 5) => ({
  externalProductCode, stock, qty, product: null,
}) as Pick<QuoteItemEntity, "externalProductCode" | "product" | "qty" | "stock">;

test("order export requires an ERP code even when export without stock is enabled", () => {
  const result = evaluateQuoteOrderItems([item(null, 0)], true);
  assert.equal(result.missingErpCode, true);
  assert.equal(result.requiresReadyRequisition, false);
});

test("stock shortage requires a ready requisition by default", () => {
  const result = evaluateQuoteOrderItems([item("ERP-123", 0)], false);
  assert.equal(result.missingErpCode, false);
  assert.equal(result.requiresPurchasing, true);
  assert.equal(result.requiresReadyRequisition, true);
});

test("enabled setting permits an ERP-coded item without stock while preserving purchasing work", () => {
  const result = evaluateQuoteOrderItems([item("ERP-123", null)], true);
  assert.equal(result.missingErpCode, false);
  assert.equal(result.requiresPurchasing, true);
  assert.equal(result.requiresReadyRequisition, false);
});

test("mixed ERP and local items cannot be exported even with the setting enabled", () => {
  const result = evaluateQuoteOrderItems([item("ERP-123", 0), item(null, 0)], true);
  assert.equal(result.missingErpCode, true);
});

test("items with enough stock do not require a purchase requisition", () => {
  const result = evaluateQuoteOrderItems([item("ERP-123", 5)], false);
  assert.equal(result.requiresPurchasing, false);
  assert.equal(result.requiresReadyRequisition, false);
});

test("order export resolves an ERP product code if the external field is blank", () => {
  const productItem = { ...item("  ", 5), product: { code: " 03-123 ", id: "", ean: null, description: "", unit: "PZ", currency: "MXN" as const } };
  assert.equal(getOrderItemErpCode(productItem), "03-123");
});

test("local customers require the explicit order file setting", () => {
  const customer = { source: "LOCAL" as const, code: null };
  assert.equal(isCustomerEligibleForOrderFile(customer, false), false);
  assert.equal(isCustomerEligibleForOrderFile(customer, true), true);
});

test("ERP customers still require a code when local export is enabled", () => {
  assert.equal(isCustomerEligibleForOrderFile({ source: "ERP", code: "  " }, true), false);
  assert.equal(isCustomerEligibleForOrderFile({ source: "ERP", code: " 123 " }, false), true);
  assert.equal(isCustomerEligibleForOrderFile(null, true), false);
});
