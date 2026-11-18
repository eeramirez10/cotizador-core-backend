import { Router } from "express";
import { CommercialReportError } from "../../domain/contracts/commercial-report";
import { parseCommercialReportQuery } from "../../domain/use-cases/commercial-report-query";
import { CommercialReportUseCase } from "../../domain/use-cases/commercial-report.use-case";
import { PrismaAnalyticsDatasource } from "../../infrastructure/datasources/prisma-analytics.datasource";
import { ManagerReportPdfAdapter } from "../../infrastructure/documents/manager-report-pdf.adapter";
import { AnalyticsRepositoryImpl } from "../../infrastructure/repositories/analytics.repository-impl";
import { PrismaCommercialReportDirectory } from "../../infrastructure/repositories/prisma-commercial-report-directory";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";

export function commercialReportsRoutes() {
  const router = Router();
  const reports = new CommercialReportUseCase(new AnalyticsRepositoryImpl(new PrismaAnalyticsDatasource()), new PrismaCommercialReportDirectory());
  const pdf = new ManagerReportPdfAdapter();
  router.use(requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"));
  const error = (res: import("express").Response, cause: unknown) => {
    if (cause instanceof CommercialReportError) return void res.status(cause.status).json({ error: cause.message });
    console.error("commercial_report.failed", cause instanceof Error ? cause.name : "unknown");
    res.status(500).json({ error: "No se pudo generar el reporte. Intenta nuevamente." });
  };
  router.get("/options", async (req, res) => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try { res.json(await reports.options(req.user)); } catch (cause) { error(res, cause); }
  });
  router.get("/quotes", async (req, res) => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try { res.json(await reports.execute(parseCommercialReportQuery(req.query), req.user)); } catch (cause) { error(res, cause); }
  });
  router.get("/quotes/pdf", async (req, res) => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const query = parseCommercialReportQuery(req.query);
      const report = await reports.execute(query, req.user, true);
      const buffer = pdf.create(report);
      res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Reporte-Cotizaciones-${query.from}-al-${query.to}.pdf"`, "Cache-Control": "private, no-store" });
      res.send(buffer);
    } catch (cause) { error(res, cause); }
  });
  return router;
}
