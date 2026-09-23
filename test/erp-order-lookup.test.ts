import assert from "node:assert/strict";
import test from "node:test";
import { ErpOrderLookupAdapter } from "../src/infrastructure/http/erp-order-lookup.adapter";

test("ERP order lookup uses the order endpoint and internal key", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:3500/api/erp/orders/P021827");
    assert.equal((init?.headers as Record<string, string>)["x-internal-api-key"], "secret");
    return Response.json({ orderNumber: "P021827", customerCode: "CLI-1" });
  };
  try {
    const lookup = new ErpOrderLookupAdapter("http://localhost:3500/", 1000, "secret");
    assert.deepEqual(await lookup.findByNumber("P021827"), {
      orderNumber: "P021827", customerCode: "CLI-1",
    });
  } finally { globalThis.fetch = previous; }
});

test("ERP order lookup fails closed for missing and malformed responses", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 404 });
    const lookup = new ErpOrderLookupAdapter("http://localhost:3500", 1000);
    assert.equal(await lookup.findByNumber("P021827"), null);
    globalThis.fetch = async () => Response.json({ orderNumber: "PB021827" });
    await assert.rejects(() => lookup.findByNumber("P021827"), /INVALID_RESPONSE/);
  } finally { globalThis.fetch = previous; }
});
