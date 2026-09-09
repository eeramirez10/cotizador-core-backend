import { Router } from "express";
import { Envs } from "../../config/envs";
import { ChangeQuoteStatusUseCase } from "../../domain/use-cases/change-quote-status.use-case";
import { ExecuteWhatsAppAssistantToolUseCase } from "../../domain/use-cases/execute-whatsapp-assistant-tool.use-case";
import { PrismaPurchaseRequisitionDatasource } from "../../infrastructure/datasources/prisma-purchase-requisition.datasource";
import { PrismaQuoteCatalogDatasource } from "../../infrastructure/datasources/prisma-quote-catalog.datasource";
import { PrismaQuoteDatasource } from "../../infrastructure/datasources/prisma-quote.datasource";
import { PrismaWhatsAppAssistantRepository } from "../../infrastructure/repositories/prisma-whatsapp-assistant.repository";
import { PurchaseRequisitionRepositoryImpl } from "../../infrastructure/repositories/purchase-requisition.repository-impl";
import { QuoteCatalogRepositoryImpl } from "../../infrastructure/repositories/quote-catalog.repository-impl";
import { QuoteRepositoryImpl } from "../../infrastructure/repositories/quote.repository-impl";
import { requireInternalApiKey } from "../middlewares/internal-api-key.middleware";
import { WhatsAppAssistantController } from "./whatsapp-assistant.controller";

export class WhatsAppAssistantRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new PrismaWhatsAppAssistantRepository();
    const changeStatus = new ChangeQuoteStatusUseCase(
      new QuoteRepositoryImpl(new PrismaQuoteDatasource()),
      new QuoteCatalogRepositoryImpl(new PrismaQuoteCatalogDatasource()),
      new PurchaseRequisitionRepositoryImpl(
        new PrismaPurchaseRequisitionDatasource(Envs.requisitionInternalApprovalEnabled),
      ),
      Envs.quoteInternalApprovalEnabled,
    );
    const controller = new WhatsAppAssistantController(
      new ExecuteWhatsAppAssistantToolUseCase(repository, changeStatus),
    );
    router.post("/tools", requireInternalApiKey(Envs.whatsAppAssistantInternalApiKey), controller.execute);
    return router;
  }
}
