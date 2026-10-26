import assert from "node:assert/strict";
import test from "node:test";
import { ErpProductCatalogsAdapter } from "../src/infrastructure/http/erp-product-catalogs.adapter";

test("ERP product catalogs use the internal products endpoint and key", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedKey = "";
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedKey = new Headers(init?.headers).get("x-internal-api-key") || "";
    return new Response(JSON.stringify({ units: [], groups: [] }), { status: 200 });
  };
  try {
    const result = await new ErpProductCatalogsAdapter("https://erp.example/", "/api/erp/products/", 1000, "test-key").list();
    assert.deepEqual(result, { units: [], groups: [] });
    assert.equal(requestedUrl, "https://erp.example/api/erp/products/catalogs");
    assert.equal(requestedKey, "test-key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ERP product catalogs reject missing configuration and malformed responses", async () => {
  await assert.rejects(new ErpProductCatalogsAdapter("https://erp.example", "/api/erp/products", 1000, undefined).list(), /clave interna/);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ units: [] }), { status: 200 });
  try {
    await assert.rejects(new ErpProductCatalogsAdapter("https://erp.example", "/api/erp/products", 1000, "test-key").list(), /no válido/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
