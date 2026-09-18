import { Router } from "express";
import { Envs } from "../../config/envs";
import { ChangeQuoteStatusUseCase } from "../../domain/use-cases/change-quote-status.use-case";
import { ExecuteWhatsAppAssistantToolUseCase } from "../../domain/use-cases/execute-whatsapp-assistant-tool.use-case";
import { PrismaPurchaseRequisitionDatasource } from "../../infrastructure/datasources/prisma-purchase-requisition.datasource";
import { PrismaQuoteCatalogDatasource } from "../../infrastructure/datasources/prisma-quote-catalog.datasource";
import { PrismaQuoteDatasource } from "../../infrastructure/datasources/prisma-quote.datasource";
import { PrismaAnalyticsDatasource } from "../../infrastructure/datasources/prisma-analytics.datasource";
import { AnalyticsRepositoryImpl } from "../../infrastructure/repositories/analytics.repository-impl";
import { PrismaWhatsAppAssistantRepository } from "../../infrastructure/repositories/prisma-whatsapp-assistant.repository";
import { PrismaWhatsAppInternalAssistantRepository } from "../../infrastructure/repositories/prisma-whatsapp-internal-assistant.repository";
import { TwilioInternalVerificationAdapter } from "../../infrastructure/messaging/twilio-internal-verification.adapter";
import { PurchaseRequisitionRepositoryImpl } from "../../infrastructure/repositories/purchase-requisition.repository-impl";
import { QuoteCatalogRepositoryImpl } from "../../infrastructure/repositories/quote-catalog.repository-impl";
import { QuoteRepositoryImpl } from "../../infrastructure/repositories/quote.repository-impl";
import { requireInternalApiKey } from "../middlewares/internal-api-key.middleware";
import { WhatsAppAssistantController } from "./whatsapp-assistant.controller";
import { WhatsAppInternalAssistantUseCase } from "../../domain/use-cases/whatsapp-internal-assistant.use-case";
import { WhatsAppLeadAssistantUseCase } from "../../domain/use-cases/whatsapp-lead-assistant.use-case";
import { PrismaWhatsAppLeadRepository } from "../../infrastructure/repositories/prisma-whatsapp-lead.repository";
import { whatsAppRealtimeBus } from "../../infrastructure/realtime/whatsapp-realtime.container";
import { composeWhatsAppInternalAlert } from "../composition/whatsapp-internal-alert.composition";

export class WhatsAppAssistantRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new PrismaWhatsAppAssistantRepository();
    const internalAlerts = composeWhatsAppInternalAlert();
    const changeStatus = new ChangeQuoteStatusUseCase(
      new QuoteRepositoryImpl(new PrismaQuoteDatasource()),
      new QuoteCatalogRepositoryImpl(new PrismaQuoteCatalogDatasource()),
      new PurchaseRequisitionRepositoryImpl(
        new PrismaPurchaseRequisitionDatasource(Envs.requisitionInternalApprovalEnabled),
      ),
      Envs.quoteInternalApprovalEnabled,
      whatsAppRealtimeBus,
      internalAlerts,
    );
    const controller = new WhatsAppAssistantController(
      new ExecuteWhatsAppAssistantToolUseCase(
        repository,
        changeStatus,
        15,
        new WhatsAppInternalAssistantUseCase(
          new PrismaWhatsAppInternalAssistantRepository(),
          new AnalyticsRepositoryImpl(new PrismaAnalyticsDatasource()),
          new TwilioInternalVerificationAdapter({
            enabled: Envs.whatsAppInternalVerificationEnabled,
            accountSid: Envs.twilioAccountSid,
            authToken: Envs.twilioAuthToken,
            serviceSid: Envs.twilioVerifyServiceSid,
          }),
          Envs.whatsAppInternalVerificationTtlDays,
          Envs.whatsAppInternalVerificationResendSeconds,
        ),
        new WhatsAppLeadAssistantUseCase(new PrismaWhatsAppLeadRepository(), whatsAppRealtimeBus),
        whatsAppRealtimeBus,
        internalAlerts,
      ),
    );
    router.post("/tools", requireInternalApiKey(Envs.whatsAppAssistantInternalApiKey), controller.execute);
    return router;
  }
}
