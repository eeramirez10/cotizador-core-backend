import assert from "node:assert/strict";
import test from "node:test";
import { ErpCustomerLookupAdapter } from "../src/infrastructure/http/erp-customer-lookup.adapter";

test("ERP customer lookup accepts only the exact code and preserves CLISEQ", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => Response.json([
    { code: "C1234", externalId: "41", taxId: "RFC123" },
    { code: "C123", externalId: "42", taxId: "RFC456" },
  ]);
  try {
    const lookup = new ErpCustomerLookupAdapter("http://localhost:3500", 1000);
    assert.deepEqual(await lookup.findByCode("C123"), { code: "C123", externalId: "42", taxId: "RFC456" });
  } finally { globalThis.fetch = previous; }
});

test("ERP customer lookup rejects malformed responses instead of linking blindly", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ items: [] });
  try {
    const lookup = new ErpCustomerLookupAdapter("http://localhost:3500", 1000);
    await assert.rejects(() => lookup.findByCode("C123"), /ERP_CUSTOMER_LOOKUP_INVALID_RESPONSE/);
  } finally { globalThis.fetch = previous; }
});
