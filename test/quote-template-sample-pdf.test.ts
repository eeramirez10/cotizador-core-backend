import assert from "node:assert/strict";
import test from "node:test";
import { createQuoteTemplateSamplePdf } from "../src/presentation/public/quote-template-sample-pdf";

test("Twilio template sample is a valid-looking PDF document", () => {
  const pdf = createQuoteTemplateSamplePdf();

  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  assert.match(pdf.toString("ascii"), /startxref\n\d+\n%%EOF/);
});
