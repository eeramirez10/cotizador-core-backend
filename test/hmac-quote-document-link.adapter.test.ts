import assert from "node:assert/strict";
import test from "node:test";
import { HmacQuoteDocumentLinkAdapter } from "../src/infrastructure/security/hmac-quote-document-link.adapter";

test("signed quote document tokens include a PDF suffix and can be verified", () => {
  const links = new HmacQuoteDocumentLinkAdapter("test-secret", 60);
  const token = links.createToken("file-asset-id");

  assert.match(token, /\.pdf$/);
  assert.equal(links.verify(token), "file-asset-id");
});

test("tampered quote document tokens are rejected", () => {
  const links = new HmacQuoteDocumentLinkAdapter("test-secret", 60);
  const token = links.createToken("file-asset-id");

  assert.equal(links.verify(`x${token}`), null);
});
