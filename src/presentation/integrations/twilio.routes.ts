import { Router } from "express";
import { Envs } from "../../config/envs";
import { UpdateWhatsAppDeliveryStatusUseCase } from "../../domain/use-cases/update-whatsapp-delivery-status.use-case";
import { GetWhatsAppConversationWindowUseCase } from "../../domain/use-cases/get-whatsapp-conversation-window.use-case";
import { RecordInboundWhatsAppMessageUseCase } from "../../domain/use-cases/record-inbound-whatsapp-message.use-case";
import { PrismaQuoteDatasource } from "../../infrastructure/datasources/prisma-quote.datasource";
import { QuoteRepositoryImpl } from "../../infrastructure/repositories/quote.repository-impl";
import { PrismaWhatsAppConversationRepository } from "../../infrastructure/repositories/prisma-whatsapp-conversation.repository";
import { requireAuth } from "../middlewares/auth.middleware";
import { TwilioController } from "./twilio.controller";

export class TwilioRoutes {
  static routes(): Router {
    const router = Router();
    const conversationRepository = new PrismaWhatsAppConversationRepository();
    const controller = new TwilioController(
      new UpdateWhatsAppDeliveryStatusUseCase(new QuoteRepositoryImpl(new PrismaQuoteDatasource())),
      new RecordInboundWhatsAppMessageUseCase(conversationRepository),
      new GetWhatsAppConversationWindowUseCase(conversationRepository, Envs.twilioWhatsAppFrom),
      Envs.twilioAuthToken,
      Envs.twilioStatusCallbackUrl,
      Envs.twilioIncomingWebhookUrl,
    );
    router.get("/whatsapp/window", requireAuth, controller.whatsappWindow);
    router.post("/whatsapp/incoming", controller.whatsappIncoming);
    router.post("/whatsapp/status", controller.whatsappStatus);
    return router;
  }
}
