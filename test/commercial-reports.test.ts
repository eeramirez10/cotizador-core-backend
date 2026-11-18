import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { CommercialReportError, type CommercialReportDirectory, type ReportActor } from "../src/domain/contracts/commercial-report";
import { parseCommercialReportQuery, previousReportQuery } from "../src/domain/use-cases/commercial-report-query";
import { CommercialReportUseCase, groupReportRows } from "../src/domain/use-cases/commercial-report.use-case";
import type { AnalyticsRepository } from "../src/domain/repositories/analytics.repository";
import type { AnalyticsDatasourceParams } from "../src/domain/datasources/analytics.datasource";
import { ManagerReportPdfAdapter } from "../src/infrastructure/documents/manager-report-pdf.adapter";

const branch = "00000000-0000-4000-8000-000000000001";
const otherBranch = "00000000-0000-4000-8000-000000000002";
const seller = "00000000-0000-4000-8000-000000000011";
const otherSeller = "00000000-0000-4000-8000-000000000012";
const actor: ReportActor = { id: seller, branchId: branch, role: "SELLER" };
const admin = { ...actor, role: "ADMIN" };
const options = {
  branches: [{ id: branch, name: "México", isActive: true }, { id: otherBranch, name: "Veracruz", isActive: true }],
  sellers: [{ id: seller, name: "Vendedora uno", branchId: branch, isActive: true }, { id: otherSeller, name: "Vendedor dos", branchId: otherBranch, isActive: false }],
};
const query = (extra: Record<string, unknown> = {}) => parseCommercialReportQuery({ from: "2026-11-01", to: "2026-11-18", ...extra });
const requireModule = createRequire(process.cwd() + "/package.json");
function load(path: string, overrides: Record<string, unknown>) {
  const source = readFileSync(path, "utf8");
  const module = { exports: {} as Record<string, any> };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module, exports: module.exports, Date, Intl, require: (name: string) => overrides[name] || requireModule(name) });
  return module.exports;
}
function raw(id: string, extra: Record<string, unknown> = {}) {
  return {
    id, rootQuoteId: null, revisionNumber: 1, quoteNumber: "QT-" + id, customerReference: "RFQ-100", status: "APPROVED",
    currency: "MXN", sourceChannel: "WHATSAPP", captureMethod: "SYSTEM", rejectionReason: null,
    total: 100, orderStatus: "GENERATED", createdAt: new Date("2026-11-18T06:00:00Z"), createdByUserId: seller,
    providedByUserId: null, providedByNameSnapshot: null, providedByBranchNameSnapshot: null,
    customerId: "customer", customer: { displayName: "Cliente", legalName: null },
    branchId: branch, branch: { name: "México" }, createdByUser: { firstName: "Vendedora", lastName: "Uno" }, items: [], ...extra,
  };
}
function fixture(rows = [raw("mxn"), raw("usd", { currency: "USD", total: 50, orderStatus: "NOT_GENERATED" }),
  raw("other", { branchId: otherBranch, branch: { name: "Veracruz" }, createdByUserId: otherSeller }),
  raw("draft", { status: "DRAFT", total: 999 })]) {
  const calls: any[] = [];
  const { PrismaAnalyticsDatasource } = load("src/infrastructure/datasources/prisma-analytics.datasource.ts", {
    "../../domain/contracts/commercial-report": { CommercialReportError },
    "../database/prisma-client": { prisma: { quote: { findMany: async (params: any) => {
      calls.push(params);
      return rows.filter(row => (!params.where.currency || row.currency === params.where.currency)
        && (!params.where.branchId || row.branchId === params.where.branchId)
        && (!params.where.createdByUserId || row.createdByUserId === params.where.createdByUserId)
        && row.createdAt >= params.where.createdAt.gte && row.createdAt < params.where.createdAt.lt).slice(0, params.take);
    } } } },
  });
  const datasource = new PrismaAnalyticsDatasource();
  const repository = { getDashboard: (params: AnalyticsDatasourceParams) => datasource.getDashboard(params) } as AnalyticsRepository;
  const directory = { options: async (scope: ReportActor) => ({
    branches: options.branches.filter(row => scope.role === "ADMIN" || row.id === scope.branchId),
    sellers: options.sellers.filter(row => scope.role === "ADMIN" || row.branchId === scope.branchId)
      .filter(row => scope.role !== "SELLER" || row.id === scope.id),
  }) } as CommercialReportDirectory;
  return { calls, datasource, useCase: new CommercialReportUseCase(repository, directory) };
}

test("report query validates real dates, ranges, enums, identifiers, booleans and timezone", () => {
  const parsed = query();
  assert.equal(parsed.fromDate.toISOString(), "2026-11-01T06:00:00.000Z");
  assert.equal(parsed.toExclusive.toISOString(), "2026-11-19T06:00:00.000Z");
  for (const invalid of [
    { from: "2026-02-30" }, { from: "2027-01-01" }, { from: "2020-01-01" }, { from: ["2026-11-01"] },
    { branchId: "bad" }, { sellerId: "x OR 1=1" }, { page: "0" }, { pageSize: "101" }, { page: "1.5" },
    { compare: "yes" }, { timezone: "UTC" }, { currency: "EUR" }, { statuses: "APPROVED,UNKNOWN" },
    { sourceChannel: "UNKNOWN" }, { captureMethod: "UNKNOWN" }, { includeDetails: ["true"] },
  ]) assert.throws(() => query(invalid), CommercialReportError);
  assert.deepEqual(previousReportQuery(query()).from, "2026-10-14");
  assert.deepEqual(previousReportQuery(query()).to, "2026-10-31");
  assert.equal(query({ timezone: "America/Tijuana" }).toExclusive.toISOString(), "2026-11-19T08:00:00.000Z");
});

test("seller scope cannot be overridden; manager cannot access another branch, including PDF requests", async () => {
  const { useCase, calls } = fixture();
  for (const pdf of [false, true]) {
    await assert.rejects(useCase.execute(query({ branchId: otherBranch }), actor, pdf), /tu sucursal/);
    await assert.rejects(useCase.execute(query({ sellerId: otherSeller }), actor, pdf), /propia actividad/);
    await assert.rejects(useCase.execute(query({ branchId: otherBranch }), { ...actor, role: "MANAGER" }, pdf), /tu sucursal/);
    await assert.rejects(useCase.execute(query(), { ...actor, role: "PURCHASING" }, pdf), /acceso/);
  }
  assert.equal(calls.length, 0);
  const result = await useCase.execute(query(), actor);
  assert.equal(result.totals.created, 3);
  assert.ok(calls.every(params => params.where.createdByUserId === seller && params.where.branchId === branch));
  assert.ok(result.details.items.every(row => row.sellerId === seller && row.branchId === branch));
});

test("summary and detail keep currencies separate, retain references and paginate the filtered set", async () => {
  const { useCase } = fixture();
  const report = await useCase.execute(query({ page: "2", pageSize: "2" }), admin);
  assert.equal(report.details.total, 4);
  assert.equal(report.details.items.length, 2);
  assert.equal(report.totals.created, 4);
  assert.equal(report.totals.quotedMxn, 200);
  assert.equal(report.totals.quotedUsd, 50);
  assert.ok(report.details.items.every(row => row.customerReference === "RFQ-100"));
  const mxn = await useCase.execute(query({ currency: "MXN", statuses: "APPROVED" }), admin);
  assert.equal(mxn.totals.created, 2);
  assert.equal(mxn.totals.quotedUsd, 0);
  assert.ok(mxn.details.items.every(row => row.currency === "MXN"));
  const { created, quotedMxn, quotedUsd } = groupReportRows(report.details.items, row => [row.customerId, row.customerName])[0];
  assert.equal(created, 2);
  assert.ok(quotedMxn >= 0 && quotedUsd >= 0);
  const empty = await useCase.execute(query({ sourceChannel: "EMAIL" }), admin);
  assert.equal(empty.details.total, 0);
  assert.equal(empty.approvalRate, 0);
});

test("report consolidates a family across currencies before filtering its current version", async () => {
  const { useCase } = fixture([
    raw("base", { rootQuoteId: "root", revisionNumber: 0, status: "SUPERSEDED" }),
    raw("revision", { rootQuoteId: "root", revisionNumber: 1, currency: "USD", total: 75 }),
  ]);
  const result = await useCase.execute(query(), admin);
  assert.equal(result.totals.created, 1);
  assert.equal(result.totals.quotedMxn, 0);
  assert.equal(result.totals.quotedUsd, 75);
  assert.equal((await useCase.execute(query({ statuses: "SUPERSEDED" }), admin)).details.total, 0);
});

test("comparison uses the preceding equal-length local date period and does not mix data", async () => {
  const { useCase, calls } = fixture([raw("now"), raw("before", { total: 70, createdAt: new Date("2026-10-31T06:00:00Z") })]);
  const report = await useCase.execute(query({ compare: "true" }), admin);
  assert.equal(report.totals.quotedMxn, 100);
  assert.equal(report.comparison?.totals.quotedMxn, 70);
  assert.equal(report.comparison?.periodFrom, "2026-10-14");
  assert.equal(calls.length, 4);
});

test("PDF includes all filtered details, independent of screen pagination; scheduled PDF stays unchanged by default", async () => {
  const { useCase } = fixture();
  const report = await useCase.execute(query({ includeDetails: "true", pageSize: "1" }), admin, true);
  assert.equal(report.details.items.length, 1);
  assert.equal(report.sections?.at(-1)?.rows.length, 4);
  const rawPdf = new ManagerReportPdfAdapter().create(report).toString("ascii");
  assert.match(rawPdf, /Parametros y metodologia/);
  assert.match(rawPdf, /Detalle de cotizaciones/);
  assert.match(rawPdf, /RFQ-100/);
  assert.match(rawPdf, /Por sucursal/);
  assert.ok((rawPdf.match(/\/Type \/Page\b/g) || []).length >= 8);
  const minimal = await useCase.execute(query({ includeBreakdowns: "false" }), actor, true);
  assert.equal(minimal.sections?.length, 1);
});

test("large report and detailed PDF fail explicitly rather than silently truncating", async () => {
  const { useCase } = fixture(Array.from({ length: 1001 }, (_, i) => raw(String(i))));
  await assert.rejects(useCase.execute(query({ includeDetails: "true" }), admin, true), /1,000/);
  assert.equal((await useCase.execute(query(), admin)).details.total, 1001);
  const huge = fixture(Array.from({ length: 10001 }, (_, i) => raw(String(i))));
  await assert.rejects(huge.useCase.execute(query(), admin), /10,000/);
});

test("authenticated report routes reject inactive accounts and non-commercial roles", async () => {
  const express = requireModule("express");
  const allowed = ["ADMIN", "MANAGER", "SELLER"];
  const roles = [...allowed, "PURCHASING", "CREDIT_COLLECTIONS"];
  const { requireAuth } = load("src/presentation/middlewares/auth.middleware.ts", {
    "../../infrastructure/adapters/jwt.adapter": { JwtAdapter: { verifyAccessToken: (token: string) => ({ sub: token }) } },
    "../../infrastructure/database/prisma-client": { prisma: { user: { findUnique: async ({ where }: { where: { id: string } }) => ({
      id: where.id, role: where.id, branchId: branch, isActive: roles.includes(where.id),
    }) } } },
  });
  const { requireRoles } = load("src/presentation/middlewares/rbac.middleware.ts", {});
  const { commercialReportsRoutes } = load("src/presentation/reports/commercial-reports.routes.ts", {
    "../../domain/contracts/commercial-report": { CommercialReportError },
    "../../domain/use-cases/commercial-report-query": { parseCommercialReportQuery },
    "../../domain/use-cases/commercial-report.use-case": { CommercialReportUseCase: class {
      async options() { return options; }
      async execute() { return { totals: {}, sections: [] }; }
    } },
    "../../infrastructure/datasources/prisma-analytics.datasource": { PrismaAnalyticsDatasource: class {} },
    "../../infrastructure/documents/manager-report-pdf.adapter": { ManagerReportPdfAdapter: class { create() { return Buffer.from("%PDF-1.4"); } } },
    "../../infrastructure/repositories/analytics.repository-impl": { AnalyticsRepositoryImpl: class {} },
    "../../infrastructure/repositories/prisma-commercial-report-directory": { PrismaCommercialReportDirectory: class {} },
    "../middlewares/auth.middleware": { requireAuth }, "../middlewares/rbac.middleware": { requireRoles },
  });
  const app = express();
  app.use("/api/reports", commercialReportsRoutes());
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}/api/reports`;
  try {
    for (const path of ["/options", "/quotes", "/quotes/pdf"]) {
      for (const role of allowed) {
        const response = await fetch(base + path, { headers: { Authorization: "Bearer " + role } });
        assert.equal(response.status, 200);
        if (path.endsWith("pdf")) {
          assert.match(response.headers.get("content-type")!, /application\/pdf/);
          assert.match(response.headers.get("content-disposition")!, /^inline;/);
        }
      }
      for (const role of ["PURCHASING", "CREDIT_COLLECTIONS"]) assert.equal((await fetch(base + path, { headers: { Authorization: "Bearer " + role } })).status, 403);
      assert.equal((await fetch(base + path, { headers: { Authorization: "Bearer INACTIVE" } })).status, 401);
      assert.equal((await fetch(base + path)).status, 401);
    }
    assert.equal((await fetch(base + "/quotes?from=2026-02-30", { headers: { Authorization: "Bearer ADMIN" } })).status, 400);
  } finally { server.close(); }
});

test("scheduled analytics retains its original period labels for non-UTC midnight boundaries", async () => {
  const { datasource } = fixture();
  const result = await datasource.getDashboard({
    scopeType: "GLOBAL", scopeId: "GLOBAL", scopeName: "Todas", currency: "MXN",
    from: new Date("2026-11-01T06:00:00Z"), toExclusive: new Date("2026-11-19T06:00:00Z"),
  });
  assert.equal(result.period.from, "2026-11-01");
  assert.equal(result.period.to, "2026-11-18");
  assert.equal(result.reportRows, undefined);
});
