import assert from "node:assert/strict";
import test from "node:test";
import { parseErpDraftData } from "../src/domain/use-cases/purchase-item-erp-draft.validation";

test("ERP draft accepts partial data without pretending to create a Proscai product", () => {
  assert.deepEqual(parseErpDraftData({ description: "  TUBO DE ACERO  ", productType: 1, quotedUnitCost: 0, quotedCurrency: "USD" }), {
    description: "TUBO DE ACERO", productType: 1, quotedUnitCost: 0, quotedCurrency: "USD",
  });
});

test("ERP draft enforces documented ERP field lengths and SAT format", () => {
  assert.throws(() => parseErpDraftData({ code: "12345678901234" }), /máximo 13/);
  assert.throws(() => parseErpDraftData({ description: "X".repeat(61) }), /máximo 60/);
  assert.throws(() => parseErpDraftData({ satCode: "4017160" }), /8 dígitos/);
  assert.deepEqual(parseErpDraftData({ satCode: "40171600" }), { satCode: "40171600" });
});

test("ERP draft rejects unsupported fields, prices and product types", () => {
  assert.throws(() => parseErpDraftData({ erpStock: 25 }), /no admitidos/);
  assert.throws(() => parseErpDraftData({ salePrice1: -1 }), /no negativo/);
  assert.throws(() => parseErpDraftData({ productType: 5 }), /Tipo de producto/);
  assert.throws(() => parseErpDraftData({ quotedCurrency: "EUR" }), /MXN o USD/);
});

test("ERP draft validates the Proscai currency, IVA, weight and INOCAPAS fields", () => {
  assert.deepEqual(parseErpDraftData({ erpCurrency: 2, ivaType: 0, weight: 63.25, noLayers: false }), {
    erpCurrency: 2, ivaType: 0, weight: 63.25, noLayers: false,
  });
  assert.throws(() => parseErpDraftData({ erpCurrency: 3 }), /moneda ERP/);
  assert.throws(() => parseErpDraftData({ ivaType: 3 }), /tipo de IVA/);
  assert.throws(() => parseErpDraftData({ weight: -1 }), /weight/);
  assert.throws(() => parseErpDraftData({ noLayers: "true" }), /INOCAPAS/);
});

test("ERP draft keeps selected FFAM codes by group and rejects mismatched values", () => {
  assert.deepEqual(parseErpDraftData({ classifications: { "1": "1TT", "2": "2TUB", B: "B008", "7": "707" } }), {
    classifications: { "1": "1TT", "2": "2TUB", B: "B008", "7": "707" },
  });
  assert.deepEqual(parseErpDraftData({ classifications: {} }), { classifications: {} });
  assert.throws(() => parseErpDraftData({ classifications: { "2": "1TT" } }), /no corresponde/);
  assert.throws(() => parseErpDraftData({ classifications: { Z: "Z001" } }), /no válido/);
  assert.throws(() => parseErpDraftData({ classifications: ["2TUB"] }), /objeto/);
});
