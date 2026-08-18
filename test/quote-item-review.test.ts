import assert from "node:assert/strict";
import test from "node:test";
import { getQuoteItemReviewIssues, isQuoteItemReady } from "../src/domain/use-cases/quote-item-review.helper";

test("local product uses its customer-facing description and does not require an ERP description", () => {
  const item = {
    productId: "local-product-id",
    externalProductCode: null,
    ean: null,
    erpDescription: null,
    customerDescription: "CODO DE ACERO AL CARBON",
    qty: 2,
    unit: "PZ",
  };

  assert.equal(isQuoteItemReady(item), true);
  assert.deepEqual(getQuoteItemReviewIssues(item), []);
});

test("ERP-linked product still requires its ERP description", () => {
  const issues = getQuoteItemReviewIssues({
    productId: null,
    externalProductCode: "01302417",
    ean: null,
    erpDescription: null,
    customerDescription: "Descripción solicitada por el cliente",
    qty: 1,
    unit: "PZ",
  });

  assert.deepEqual(issues, ["missing ERP product description"]);
});

test("local product requires a quote description snapshot", () => {
  const issues = getQuoteItemReviewIssues({
    productId: "local-product-id",
    externalProductCode: null,
    ean: null,
    erpDescription: null,
    customerDescription: null,
    qty: 1,
    unit: "PZ",
  });

  assert.deepEqual(issues, ["missing local product description"]);
});
