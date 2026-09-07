import { Router } from "express";
import { Envs } from "../../config/envs";
import { UpdateWhatsAppDeliveryStatusUseCase } from "../../domain/use-cases/update-whatsapp-delivery-status.use-case";
import { PrismaQuoteDatasource } from "../../infrastructure/datasources/prisma-quote.datasource";
import { QuoteRepositoryImpl } from "../../infrastructure/repositories/quote.repository-impl";
import { TwilioController } from "./twilio.controller";

export class TwilioRoutes {
  static routes(): Router {
    const router = Router();
    const controller = new TwilioController(
      new UpdateWhatsAppDeliveryStatusUseCase(new QuoteRepositoryImpl(new PrismaQuoteDatasource())),
      Envs.twilioAuthToken,
      Envs.twilioStatusCallbackUrl,
    );
    router.post("/whatsapp/status", controller.whatsappStatus);
    return router;
  }
}
