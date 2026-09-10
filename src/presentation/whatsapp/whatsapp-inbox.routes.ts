import { Router } from "express";
import { Envs } from "../../config/envs";
import { SendWhatsAppInboxMessageUseCase } from "../../domain/use-cases/send-whatsapp-inbox-message.use-case";
import { WhatsAppInboxUseCase } from "../../domain/use-cases/whatsapp-inbox.use-case";
import { TwilioWhatsAppAssistantAdapter } from "../../infrastructure/messaging/twilio-whatsapp-assistant.adapter";
import { PrismaWhatsAppInboxRepository } from "../../infrastructure/repositories/prisma-whatsapp-inbox.repository";
import { whatsAppRealtimeBus } from "../../infrastructure/realtime/whatsapp-realtime.container";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { WhatsAppInboxController } from "./whatsapp-inbox.controller";

export class WhatsAppInboxRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new PrismaWhatsAppInboxRepository();
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
    );
    const access = [requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER")] as const;

    router.get("/", ...access, controller.list);
    router.get("/:id", ...access, controller.get);
    router.get("/:id/messages", ...access, controller.messages);
    router.post("/:id/messages", ...access, controller.send);
    router.patch("/:id/read", ...access, controller.markRead);
    router.patch("/:id/mode", ...access, controller.changeMode);
    return router;
  }
}
