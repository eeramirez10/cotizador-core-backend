import assert from "node:assert/strict";
import test from "node:test";
import { erpDraftDefaultsFromOffer, mergeSelectedOfferIntoErpDraft } from "../src/domain/use-cases/purchase-item-erp-draft.defaults";

const item = { description: "TUBO DE ACERO SIN COSTURA", unit: "PZ", erpEan: null };
const first = { currency: "MXN" as const };
const second = { currency: "USD" as const };

test("selecting an offer prepares only reference data for a local ERP draft", () => {
  assert.deepEqual(erpDraftDefaultsFromOffer(item, first), {
    description: item.description,
    productType: 1,
    unitCode: "PZ",
    erpCurrency: 1,
    ivaType: 0,
  });
});

test("switching the selected offer refreshes generated fields without losing manual ERP work", () => {
  const saved = {
    ...erpDraftDefaultsFromOffer(item, first),
    code: "LOCAL-001",
    satCode: "40171600",
    classifications: { "2": "2TUB" },
    description: "TUBO NORMALIZADO POR COMPRAS",
  };
  assert.deepEqual(mergeSelectedOfferIntoErpDraft(item, second, saved, first), {
    ...saved,
    erpCurrency: 2,
  });
});

test("manually edited ERP fields survive another supplier offer", () => {
  const saved = { ...erpDraftDefaultsFromOffer(item, first), erpCurrency: 2 as const, code: "VERIFICADO" };
  const merged = mergeSelectedOfferIntoErpDraft(item, second, saved, first);
  assert.equal(merged.code, "VERIFICADO");
  assert.equal(merged.erpCurrency, 2);
});

test("a draft without a prior selected offer is enriched only where fields are empty", () => {
  const merged = mergeSelectedOfferIntoErpDraft(item, first, { code: "LOCAL-001", description: "Revisado" });
  assert.equal(merged.code, "LOCAL-001");
  assert.equal(merged.description, "Revisado");
  assert.equal(merged.erpCurrency, 1);
});
