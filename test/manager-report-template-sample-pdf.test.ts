import assert from "node:assert/strict";
import test from "node:test";
import { createManagerReportTemplateSamplePdf } from "../src/presentation/public/manager-report-template-sample-pdf";

test("Twilio manager report sample is a valid-looking PDF document", () => {
  const pdf = createManagerReportTemplateSamplePdf();

  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  assert.match(pdf.toString("ascii"), /Reporte de cotizaciones de muestra/);
  assert.match(pdf.toString("ascii"), /startxref\n\d+\n%%EOF/);
});
