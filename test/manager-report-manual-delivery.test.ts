import assert from "node:assert/strict";
import test from "node:test";
import type { ManagerReportSnapshot } from "../src/domain/contracts/manager-report-pdf.port";
import type { ManagerReportDocumentLinkPort } from "../src/domain/contracts/manager-report-document-link.port";
import type { ManagerReportMessagingPort, SendManagerReportMessage } from "../src/domain/contracts/manager-report-messaging.port";
import { ManagerReportSubscriptionEntity } from "../src/domain/entities/manager-report-subscription.entity";
import type { ManagerReportSubscriptionRepository, RecordManagerReportSendParams } from "../src/domain/repositories/manager-report-subscription.repository";
import type { GetWhatsAppConversationWindowUseCase } from "../src/domain/use-cases/get-whatsapp-conversation-window.use-case";
import { resolveCurrentManagerReportPeriod } from "../src/domain/use-cases/manager-report-period";
import { SendManagerReportNowUseCase } from "../src/domain/use-cases/send-manager-report-now.use-case";
import type { BuildManagerReportUseCase } from "../src/domain/use-cases/build-manager-report.use-case";
import { ManagerReportPdfAdapter } from "../src/infrastructure/documents/manager-report-pdf.adapter";
import { HmacManagerReportDocumentLinkAdapter } from "../src/infrastructure/security/hmac-manager-report-document-link.adapter";

test("weekly manual report covers the current local week", () => {
  const now = new Date("2026-09-11T18:00:00.000Z");
  const period = resolveCurrentManagerReportPeriod("WEEK_TO_DATE", "America/Mexico_City", now);

  assert.equal(period.from.toISOString(), "2026-09-07T06:00:00.000Z");
  assert.equal(period.toExclusive.toISOString(), "2026-09-12T06:00:00.000Z");
  assert.equal(period.label, "2026-09-07 al 2026-09-11");
});

test("manager report ranges honor local calendar boundaries", () => {
  const now = new Date("2026-09-11T18:00:00.000Z");
  const timezone = "America/Mexico_City";
  const cases = [
    ["PREVIOUS_DAY", "2026-09-10T06:00:00.000Z", "2026-09-11T06:00:00.000Z"],
    ["PREVIOUS_WEEK", "2026-08-31T06:00:00.000Z", "2026-09-07T06:00:00.000Z"],
    ["PREVIOUS_MONTH", "2026-08-01T06:00:00.000Z", "2026-09-01T06:00:00.000Z"],
    ["LAST_7_DAYS", "2026-09-05T06:00:00.000Z", "2026-09-12T06:00:00.000Z"],
    ["LAST_30_DAYS", "2026-08-13T06:00:00.000Z", "2026-09-12T06:00:00.000Z"],
  ] as const;

  for (const [range, from, toExclusive] of cases) {
    const period = resolveCurrentManagerReportPeriod(range, timezone, now);
    assert.equal(period.from.toISOString(), from, range);
    assert.equal(period.toExclusive.toISOString(), toExclusive, range);
  }
});

test("manager report document links are signed and reject tampering", () => {
  const links = new HmacManagerReportDocumentLinkAdapter("test-secret", 60);
  const descriptor = {
    subscriptionId: "2f924ce2-46ba-42b9-8994-bff2d6b8b544",
    from: "2026-09-07T06:00:00.000Z",
    to: "2026-09-11T18:00:00.001Z",
  };
  const token = links.createToken(descriptor);

  assert.deepEqual(links.verify(token), descriptor);
  assert.equal(links.verify(`${token.slice(0, -5)}x.pdf`), null);
});

test("manager report PDF supports more than one seller page", () => {
  const snapshot: ManagerReportSnapshot = {
    scopeName: "Todas las sucursales",
    periodFrom: "2026-09-01",
    periodTo: "2026-09-11",
    generatedAt: "2026-09-11T18:00:00.000Z",
    totals: {
      created: 30,
      quoted: 25,
      approved: 10,
      pending: 5,
      ordersGenerated: 4,
      quotedMxn: 150000,
      quotedUsd: 8000,
      approvedMxn: 60000,
      approvedUsd: 3200,
    },
    sellers: Array.from({ length: 26 }, (_, index) => ({
      userId: String(index + 1),
      name: `Vendedor ${index + 1}`,
      quotes: index + 1,
      approved: index % 4,
      conversionRate: 12.5,
      quotedMxn: 1000 * index,
      quotedUsd: 100 * index,
      approvedMxn: 500 * index,
      approvedUsd: 50 * index,
    })),
  };

  const content = new ManagerReportPdfAdapter().create(snapshot);
  const raw = content.toString("ascii");
  assert.ok(raw.startsWith("%PDF-1.4"));
  assert.match(raw, /\/Count 2/);
  assert.match(raw, /\/Subtype \/Image/);
  assert.match(raw, /\/Logo Do/);
  assert.match(raw, /\(ACTIVIDAD\)/);
  assert.match(raw, /\(COTIZ\.\)/);
  assert.match(raw, /\(MXN\)/);
  assert.match(raw, /\(USD\)/);
  assert.match(raw, /Vendedor 26/);
});

test("manager report balances remaining sellers across pages", () => {
  const sellers = Array.from({ length: 44 }, (_, index) => ({
    userId: String(index + 1),
    name: `Vendedor ${index + 1}`,
    quotes: 1,
    approved: 0,
    conversionRate: 0,
    quotedMxn: 100,
    quotedUsd: 0,
    approvedMxn: 0,
    approvedUsd: 0,
  }));
  const snapshot: ManagerReportSnapshot = {
    scopeName: "Todas las sucursales",
    periodFrom: "2026-09-01",
    periodTo: "2026-09-24",
    generatedAt: "2026-09-24T18:00:00.000Z",
    totals: {
      created: 44,
      quoted: 44,
      approved: 0,
      pending: 44,
      ordersGenerated: 0,
      quotedMxn: 4400,
      quotedUsd: 0,
      approvedMxn: 0,
      approvedUsd: 0,
    },
    sellers,
  };
  const raw = new ManagerReportPdfAdapter().create(snapshot).toString("ascii");
  const pageStreams = [...raw.matchAll(/\d+ 0 obj\n<< \/Length \d+ >>\nstream\n([\s\S]*?)\nendstream/g)];
  assert.match(raw, /\/Count 3/);
  assert.deepEqual(pageStreams.map((match) => (match[1].match(/\(Vendedor \d+\)/g) || []).length), [18, 13, 13]);
});

test("manual delivery sends a signed current-period report and records the attempt", async () => {
  const subscription = new ManagerReportSubscriptionEntity({
    id: "2f924ce2-46ba-42b9-8994-bff2d6b8b544",
    reportType: "QUOTE_PERFORMANCE",
    recipient: {
      id: "98234425-7ddb-45af-bf4f-384bf64e267e",
      fullName: "Gerente Prueba",
      email: "gerente@tuvansa.com.mx",
      phone: "+525512345678",
      role: "MANAGER",
      isActive: true,
      branch: { id: "eb67cf6b-9241-4a45-adcc-2fab9dc6c76b", code: "01", name: "Mexico" },
    },
    scope: "BRANCH",
    branch: { id: "eb67cf6b-9241-4a45-adcc-2fab9dc6c76b", code: "01", name: "Mexico" },
    frequency: "WEEKLY",
    reportRange: "WEEK_TO_DATE",
    dayOfWeek: 1,
    dayOfMonth: null,
    sendHour: 8,
    sendMinute: 0,
    timezone: "America/Mexico_City",
    isActive: true,
    createdBy: { id: "f65e3a65-468c-4f84-81c7-ad90fb65596d", fullName: "Admin" },
    updatedBy: null,
    createdAt: new Date("2026-09-01T12:00:00Z"),
    updatedAt: new Date("2026-09-01T12:00:00Z"),
  });
  let sentMessage: SendManagerReportMessage | undefined;
  let recorded: RecordManagerReportSendParams | undefined;
  const repository = {
    findById: async () => subscription,
    recordSendAttempt: async (_id: string, params: RecordManagerReportSendParams) => { recorded = params; },
  } as unknown as ManagerReportSubscriptionRepository;
  const messaging = {
    send: async (message: SendManagerReportMessage) => {
      sentMessage = message;
      return { providerMessageId: "SM123", status: "QUEUED" as const, templateSid: null, deliveryMode: "FREE_FORM" as const };
    },
  } as ManagerReportMessagingPort;
  const links = {
    createToken: () => "signed-report.pdf",
  } as ManagerReportDocumentLinkPort;
  const buildReport = {
    execute: async () => ({
      scopeName: "Sucursal México",
      periodFrom: "2026-09-07",
      periodTo: "2026-09-11",
      generatedAt: "2026-09-11T18:00:00.000Z",
      totals: {
        created: 48,
        quoted: 30,
        approved: 12,
        pending: 6,
        ordersGenerated: 4,
        quotedMxn: 1_850_430,
        quotedUsd: 24_680,
        approvedMxn: 0,
        approvedUsd: 0,
      },
      sellers: [],
    }),
  } as unknown as BuildManagerReportUseCase;
  const window = {
    execute: async () => ({ active: true, deliveryMode: "FREE_FORM" as const, lastInboundAt: new Date(), expiresAt: new Date() }),
  } as GetWhatsAppConversationWindowUseCase;
  const useCase = new SendManagerReportNowUseCase(
    repository,
    buildReport,
    messaging,
    links,
    window,
    "https://example.test/cotizador/",
    () => new Date("2026-09-11T18:00:00.000Z"),
  );

  const result = await useCase.execute(subscription.id, {
    id: "f65e3a65-468c-4f84-81c7-ad90fb65596d",
    role: "ADMIN",
  });

  assert.equal(result.status, "QUEUED");
  assert.equal(sentMessage?.deliveryMode, "FREE_FORM");
  assert.match(sentMessage?.reportUrl || "", /\/api\/public\/manager-reports\/signed-report\.pdf\/Reporte-Cotizaciones-/);
  assert.equal(sentMessage?.scopeName, "Sucursal México");
  assert.equal(sentMessage?.generatedCount, 48);
  assert.equal(sentMessage?.quotedMxn, 1_850_430);
  assert.equal(sentMessage?.quotedUsd, 24_680);
  assert.match(sentMessage?.reportMediaPath || "", /^signed-report\.pdf\/Reporte-Cotizaciones-/);
  assert.equal(recorded?.providerMessageId, "SM123");
  assert.equal(recorded?.status, "QUEUED");
});
