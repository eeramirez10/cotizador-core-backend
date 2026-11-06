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

test("ERP EAN lookup uses the protected exact endpoint and preserves every match", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let requestedKey = "";
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedKey = new Headers(init?.headers).get("x-internal-api-key") || "";
    return new Response(JSON.stringify({ matches: [
      { code: "001", ean: "TCC1020RARJAE", description: "Tubo rojo", productType: 1 },
      { code: "002", ean: "TCC1020RARJAE", description: "Otro tubo", productType: 1 },
    ], hasMore: false }), { status: 200 });
  };
  try {
    const result = await new ErpProductCatalogsAdapter("https://erp.example/", "/api/erp/products/", 1000, "test-key").findExactEan("TCC1020RARJAE");
    assert.equal(requestedUrl, "https://erp.example/api/erp/products/ean-exact/TCC1020RARJAE");
    assert.equal(requestedKey, "test-key");
    assert.equal(result.matches.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Mexico references are bounded, authenticated, and preserve extended descriptions", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://erp.example/api/erp/products/ean-references");
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("x-internal-api-key"), "test-key");
    assert.deepEqual(JSON.parse(String(init?.body)), { prefixes: ["TSC1/240", "TSC1/2"] });
    return new Response(JSON.stringify({ references: [{ code: "01300129", ean: "TSC1/240AI316", description: "Descripción extendida",
      family: "B008", branchCode: "01", productType: 1 }], hasMore: false }));
  };
  try {
    const result = await new ErpProductCatalogsAdapter("https://erp.example/", "/api/erp/products/", 1000, "test-key")
      .findMexicoEanReferences(["TSC1/240", "TSC1/2"]);
    assert.equal(result.references[0].description, "Descripción extendida");
  } finally { globalThis.fetch = originalFetch; }
});

test("Mexico references reject other branches and malformed ERP payloads", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ references: [{ code: "03300129", ean: "TSC440", description: "Tubo",
    family: "B008", branchCode: "03", productType: 1 }], hasMore: false }));
  try {
    await assert.rejects(new ErpProductCatalogsAdapter("https://erp.example", "/api/erp/products", 1000, "test-key")
      .findMexicoEanReferences(["TSC440"]), /no válidas/);
  } finally { globalThis.fetch = originalFetch; }
});
