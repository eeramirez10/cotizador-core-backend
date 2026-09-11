import { Router } from "express";
import { Envs } from "../../config/envs";
import { BuildManagerReportUseCase } from "../../domain/use-cases/build-manager-report.use-case";
import { GetManagerReportDocumentUseCase } from "../../domain/use-cases/get-manager-report-document.use-case";
import { PrismaAnalyticsDatasource } from "../../infrastructure/datasources/prisma-analytics.datasource";
import { ManagerReportPdfAdapter } from "../../infrastructure/documents/manager-report-pdf.adapter";
import { AnalyticsRepositoryImpl } from "../../infrastructure/repositories/analytics.repository-impl";
import { PrismaManagerReportSubscriptionRepository } from "../../infrastructure/repositories/prisma-manager-report-subscription.repository";
import { HmacManagerReportDocumentLinkAdapter } from "../../infrastructure/security/hmac-manager-report-document-link.adapter";
import { ManagerReportsController } from "./manager-reports.controller";

export class ManagerReportsRoutes {
  static routes(): Router {
    const router = Router();
    const documentLinks = new HmacManagerReportDocumentLinkAdapter(
      Envs.quoteDocumentSigningSecret,
      Envs.quoteDocumentUrlTtlSeconds,
    );
    const controller = new ManagerReportsController(
      new GetManagerReportDocumentUseCase(
        documentLinks,
        new PrismaManagerReportSubscriptionRepository(),
        new BuildManagerReportUseCase(
          new AnalyticsRepositoryImpl(new PrismaAnalyticsDatasource()),
        ),
        new ManagerReportPdfAdapter(),
      ),
    );

    router.get("/sample.pdf", controller.sample);
    router.get("/:token/:fileName", controller.download);
    router.get("/:token", controller.download);

    return router;
  }
}
