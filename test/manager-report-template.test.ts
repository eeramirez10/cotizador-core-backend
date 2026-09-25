import assert from "node:assert/strict";
import test from "node:test";
import type { SendManagerReportMessage } from "../src/domain/contracts/manager-report-messaging.port";
import {
  assertManagerReportTemplateMatches,
  managerReportContentVariables,
} from "../src/infrastructure/messaging/manager-report-template";

const message: SendManagerReportMessage = {
  recipient: "+525512345678",
  recipientName: "Erick Ramirez",
  scopeName: "Sucursal México",
  periodLabel: "2026-09-01 al 2026-09-24",
  generatedCount: 48,
  quotedMxn: 1_850_430,
  quotedUsd: 24_680,
  reportUrl: "https://example.test/cotizador/api/public/manager-reports/signed-token/Reporte-Cotizaciones.pdf",
  reportMediaPath: "signed-token/Reporte-Cotizaciones.pdf",
  messageBody: "Reporte de prueba",
  deliveryMode: "TEMPLATE",
};

const body = "Hola {{1}}. Reporte de {{2}}, periodo {{3}}. Generadas {{4}}. MXN {{5}}. USD {{6}}.";

test("manager report template fills all body variables and its real PDF path", () => {
  assert.deepEqual(managerReportContentVariables(message, "7"), {
    "1": "Erick Ramirez",
    "2": "Sucursal México",
    "3": "2026-09-01 al 2026-09-24",
    "4": "48",
    "5": "$1,850,430.00",
    "6": "USD 24,680.00",
    "7": "signed-token/Reporte-Cotizaciones.pdf",
  });
  assert.doesNotThrow(() => assertManagerReportTemplateMatches({
    types: {
      "twilio/media": {
        body,
        media: ["https://example.test/cotizador/api/public/manager-reports/{{7}}"],
      },
    },
  }, message, "7"));
});

test("manager report template refuses a sample PDF or the wrong variable", () => {
  assert.throws(() => assertManagerReportTemplateMatches({
    types: {
      "twilio/media": {
        body,
        media: ["https://example.test/cotizador/api/public/manager-reports/sample.pdf"],
      },
    },
  }, message, "7"), /Media URL/);
  assert.throws(() => assertManagerReportTemplateMatches({
    types: {
      "twilio/media": {
        body,
        media: ["https://example.test/cotizador/api/public/manager-reports/{{7}}"],
      },
    },
  }, message, "3"), /Media URL/);
  assert.throws(() => assertManagerReportTemplateMatches({
    types: {
      "twilio/media": {
        body,
        media: ["https://production.example/cotizador/api/public/manager-reports/{{7}}"],
      },
    },
  }, message, "7"), /does not match/);
});
