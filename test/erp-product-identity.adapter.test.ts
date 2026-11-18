import assert from "node:assert/strict";
import test from "node:test";
import { ErpProductLookupAdapter } from "../src/infrastructure/http/erp-product-lookup.adapter";
import { RequisitionErpLinkError } from "../src/domain/use-cases/requisition-erp-link-rule";

test("verification sends branch account and key, accepts no EAN, and separates missing products from an unavailable ERP", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ code: "01300938", ean: "", description: "Tubo", unit: "M" }));
  const lookup = new ErpProductLookupAdapter("https://erp.invalid/", "/api/erp/products", 100, "test-key");
  assert.deepEqual(await lookup.findByCodeAndAccount("01300938", "1115001"), { code: "01300938", ean: "", description: "Tubo", unit: "M" });
  assert.equal(fetch.mock.calls[0].arguments[0], "https://erp.invalid/api/erp/products/identity/01300938?primaryAccount=1115001");
  assert.deepEqual(fetch.mock.calls[0].arguments[1]?.headers, { "x-internal-api-key": "test-key" });
  fetch.mock.mockImplementationOnce(async () => new Response(null, { status: 404 }));
  assert.equal(await lookup.findByCodeAndAccount("01300938", "1115002"), null);
  fetch.mock.mockImplementationOnce(async () => { throw new DOMException("timeout", "TimeoutError"); });
  await assert.rejects(lookup.findByCodeAndAccount("01300938", "1115001"), (error: unknown) =>
    error instanceof RequisitionErpLinkError && error.status === 502);
});
