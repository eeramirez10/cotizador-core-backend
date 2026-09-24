import assert from "node:assert/strict";
import test from "node:test";
import { latestSentQuotePerFamily } from "../src/infrastructure/repositories/current-whatsapp-quote-revisions";

test("lists the latest sent revision once even when the original is still approved", () => {
  const original = {
    id: "original",
    rootQuoteId: null,
    revisionNumber: 0,
    deliveryAttempts: [{ sentAt: new Date("2026-09-22T14:00:00Z") }],
  };
  const revision = {
    id: "revision",
    rootQuoteId: "original",
    revisionNumber: 1,
    deliveryAttempts: [{ sentAt: new Date("2026-09-22T13:00:00Z") }],
  };
  const other = {
    id: "other",
    rootQuoteId: null,
    revisionNumber: 0,
    deliveryAttempts: [{ sentAt: new Date("2026-09-22T12:00:00Z") }],
  };

  assert.deepEqual(latestSentQuotePerFamily([original, other, revision], 2), [revision, other]);
});
