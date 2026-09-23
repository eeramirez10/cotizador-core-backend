import assert from "node:assert/strict";
import test from "node:test";
import { ErpQuoteLookupAdapter } from "../src/infrastructure/http/erp-quote-lookup.adapter";

test("ERP quote lookup uses exact folio and internal API key", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:3500/api/erp/quotes/COT-123");
    assert.equal((init?.headers as Record<string, string>)["x-internal-api-key"], "secret");
    return Response.json({ quoteNumber: "COT-123", customerCode: "CLI-1" });
  };
  try {
    const lookup = new ErpQuoteLookupAdapter("http://localhost:3500/", 1000, "secret");
    assert.deepEqual(await lookup.findByNumber("COT-123"), {
      quoteNumber: "COT-123", customerCode: "CLI-1",
    });
  } finally { globalThis.fetch = previous; }
});

test("ERP quote lookup fails closed on missing and malformed responses", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 404 });
    const lookup = new ErpQuoteLookupAdapter("http://localhost:3500", 1000);
    assert.equal(await lookup.findByNumber("COT-123"), null);

    globalThis.fetch = async () => Response.json({ quoteNumber: "OTHER", customerCode: "CLI-1" });
    await assert.rejects(() => lookup.findByNumber("COT-123"), /ERP_QUOTE_LOOKUP_INVALID_RESPONSE/);

    globalThis.fetch = async () => new Response(null, { status: 503 });
    await assert.rejects(() => lookup.findByNumber("COT-123"), /ERP_QUOTE_LOOKUP_FAILED:503/);
  } finally { globalThis.fetch = previous; }
});
