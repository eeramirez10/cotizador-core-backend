import assert from "node:assert/strict";
import test from "node:test";
import { ErpProductsSearchAdapter } from "../src/infrastructure/http/erp-products-search.adapter";

test("keeps an ERP catalog product without warehouse or cost", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => new Response(JSON.stringify({
    items: [{
      id: "29832",
      code: "03-23728000",
      ean: "VB2F500",
      description: "VALVULA DE ACERO INOXIDABLE",
      stock: 0,
      unit: "PZ",
      saleCurrency: "USD",
      costCurrency: "MXN",
      averageCostMxn: 0,
      lastCostMxn: 0,
      hasUsableCost: false,
      warehouseId: "",
      warehouseName: "SIN ALMACEN ERP",
    }],
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  const adapter = new ErpProductsSearchAdapter(
    "http://erp.test",
    "/api/erp/products",
    1_000,
    "test-key",
  );
  const products = await adapter.search("VB2F500", ["15"]);

  assert.equal(products.length, 1);
  assert.equal(products[0]?.code, "03-23728000");
  assert.equal(products[0]?.ean, "VB2F500");
  assert.equal(products[0]?.warehouseId, "");
  assert.equal(products[0]?.hasUsableCost, false);
});
