import { Router } from "express";
import { Envs } from "../../config/envs";
import { SendWhatsAppInboxMessageUseCase } from "../../domain/use-cases/send-whatsapp-inbox-message.use-case";
import { WhatsAppInboxUseCase } from "../../domain/use-cases/whatsapp-inbox.use-case";
import { AssignWhatsAppLeadUseCase } from "../../domain/use-cases/assign-whatsapp-lead.use-case";
import { ConvertWhatsAppLeadUseCase } from "../../domain/use-cases/convert-whatsapp-lead.use-case";
import { DownloadWhatsAppInboundAttachmentUseCase } from "../../domain/use-cases/download-whatsapp-inbound-attachment.use-case";
import { MarkWhatsAppInboundAttachmentQuoteExtractionUseCase } from "../../domain/use-cases/mark-whatsapp-inbound-attachment-quote-extraction.use-case";
import { DeleteWhatsAppConversationUseCase } from "../../domain/use-cases/delete-whatsapp-conversation.use-case";
import { TwilioWhatsAppAssistantAdapter } from "../../infrastructure/messaging/twilio-whatsapp-assistant.adapter";
import { PrismaWhatsAppInboxRepository } from "../../infrastructure/repositories/prisma-whatsapp-inbox.repository";
import { PrismaWhatsAppLeadRepository } from "../../infrastructure/repositories/prisma-whatsapp-lead.repository";
import { PrismaWhatsAppInboundAttachmentRepository } from "../../infrastructure/repositories/prisma-whatsapp-inbound-attachment.repository";
import { LocalFileStorageAdapter } from "../../infrastructure/storage/local-file-storage.adapter";
import { whatsAppRealtimeBus } from "../../infrastructure/realtime/whatsapp-realtime.container";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireWhatsAppInboxEnabled } from "../middlewares/feature-flags.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { WhatsAppInboxController } from "./whatsapp-inbox.controller";

export class WhatsAppInboxRoutes {
  static routes(): Router {
    const router = Router();
    router.use(requireWhatsAppInboxEnabled);
    const repository = new PrismaWhatsAppInboxRepository();
    const attachmentRepository = new PrismaWhatsAppInboundAttachmentRepository();
    const controller = new WhatsAppInboxController(
      new WhatsAppInboxUseCase(repository, () => new Date(), whatsAppRealtimeBus),
      new SendWhatsAppInboxMessageUseCase(
        repository,
        new TwilioWhatsAppAssistantAdapter({
          enabled: Envs.twilioWhatsAppEnabled,
          accountSid: Envs.twilioAccountSid,
          authToken: Envs.twilioAuthToken,
          from: Envs.twilioWhatsAppFrom,
          statusCallbackUrl: Envs.twilioStatusCallbackUrl,
        }),
        () => new Date(),
        whatsAppRealtimeBus,
      ),
      new AssignWhatsAppLeadUseCase(
        new PrismaWhatsAppLeadRepository(),
        repository,
        whatsAppRealtimeBus,
      ),
      new ConvertWhatsAppLeadUseCase(
        new PrismaWhatsAppLeadRepository(),
        repository,
        whatsAppRealtimeBus,
      ),
      new DownloadWhatsAppInboundAttachmentUseCase(
        attachmentRepository,
        new LocalFileStorageAdapter(Envs.fileStorageRoot),
      ),
      new MarkWhatsAppInboundAttachmentQuoteExtractionUseCase(attachmentRepository),
      new DeleteWhatsAppConversationUseCase(
        repository,
        new LocalFileStorageAdapter(Envs.fileStorageRoot),
        whatsAppRealtimeBus,
      ),
    );
    const access = [requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER")] as const;

    router.get("/", ...access, controller.list);
    router.get("/attachments/:attachmentId/download", ...access, controller.downloadAttachment);
    router.post(
      "/attachments/:attachmentId/quote-extractions",
      requireAuth,
      requireRoles("SELLER"),
      controller.markAttachmentQuoteExtraction,
    );
    router.get("/:id", ...access, controller.get);
    router.delete("/:id", requireAuth, requireRoles("ADMIN"), controller.delete);
    router.get("/:id/messages", ...access, controller.messages);
    router.get("/:id/quotes", ...access, controller.quotes);
    router.post("/:id/messages", ...access, controller.send);
    router.patch("/:id/read", ...access, controller.markRead);
    router.patch("/:id/mode", ...access, controller.changeMode);
    router.patch(
      "/:id/lead-assignment",
      requireAuth,
      requireRoles("ADMIN", "MANAGER"),
      controller.assignLead,
    );
    router.patch("/:id/lead-conversion", ...access, controller.convertLead);
    return router;
  }
}
