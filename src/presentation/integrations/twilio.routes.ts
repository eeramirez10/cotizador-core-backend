import { Router } from "express";
import { Envs } from "../../config/envs";
import { UpdateWhatsAppDeliveryStatusUseCase } from "../../domain/use-cases/update-whatsapp-delivery-status.use-case";
import { GetWhatsAppConversationWindowUseCase } from "../../domain/use-cases/get-whatsapp-conversation-window.use-case";
import { RecordInboundWhatsAppMessageUseCase } from "../../domain/use-cases/record-inbound-whatsapp-message.use-case";
import { CaptureWhatsAppInboundMediaUseCase } from "../../domain/use-cases/capture-whatsapp-inbound-media.use-case";
import { PrismaQuoteDatasource } from "../../infrastructure/datasources/prisma-quote.datasource";
import { QuoteRepositoryImpl } from "../../infrastructure/repositories/quote.repository-impl";
import { PrismaWhatsAppConversationRepository } from "../../infrastructure/repositories/prisma-whatsapp-conversation.repository";
import { PrismaWhatsAppInboxRepository } from "../../infrastructure/repositories/prisma-whatsapp-inbox.repository";
import { PrismaWhatsAppParticipantResolver } from "../../infrastructure/repositories/prisma-whatsapp-participant-resolver";
import { PrismaWhatsAppInboundAttachmentRepository } from "../../infrastructure/repositories/prisma-whatsapp-inbound-attachment.repository";
import { TwilioWhatsAppMediaDownloaderAdapter } from "../../infrastructure/http/twilio-whatsapp-media-downloader.adapter";
import { LocalFileStorageAdapter } from "../../infrastructure/storage/local-file-storage.adapter";
import { whatsAppRealtimeBus } from "../../infrastructure/realtime/whatsapp-realtime.container";
import { requireAuth } from "../middlewares/auth.middleware";
import { TwilioController } from "./twilio.controller";
import { composeWhatsAppInternalAlert } from "../composition/whatsapp-internal-alert.composition";
import { runtimeSystemSettings } from "../../infrastructure/config/runtime-system-settings";

export class TwilioRoutes {
  static routes(): Router {
    const router = Router();
    const conversationRepository = new PrismaWhatsAppConversationRepository();
    const inboxRepository = new PrismaWhatsAppInboxRepository();
    const internalAlerts = composeWhatsAppInternalAlert();
    const controller = new TwilioController(
      new UpdateWhatsAppDeliveryStatusUseCase(
        new QuoteRepositoryImpl(new PrismaQuoteDatasource()),
        inboxRepository,
        whatsAppRealtimeBus,
      ),
      new RecordInboundWhatsAppMessageUseCase(
        conversationRepository,
        () => new Date(),
        () => runtimeSystemSettings.boolean("WHATSAPP_ASSISTANT_ENABLED"),
        whatsAppRealtimeBus,
        new PrismaWhatsAppParticipantResolver(),
        new CaptureWhatsAppInboundMediaUseCase(
          new PrismaWhatsAppInboundAttachmentRepository(),
          new TwilioWhatsAppMediaDownloaderAdapter(
            Envs.twilioAccountSid,
            Envs.twilioAuthToken,
            Envs.fileUploadMaxMb * 1024 * 1024,
          ),
          new LocalFileStorageAdapter(Envs.fileStorageRoot),
        ),
        internalAlerts,
        () => runtimeSystemSettings.number("WHATSAPP_HUMAN_RESPONSE_GRACE_MINUTES") * 60 * 1000,
        () => runtimeSystemSettings.number("WHATSAPP_HUMAN_TAKEOVER_MAX_MINUTES") * 60 * 1000,
      ),
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
