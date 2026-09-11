import { Router } from "express";
import { ManagerReportSubscriptionsUseCase } from "../../domain/use-cases/manager-report-subscriptions.use-case";
import { SendManagerReportNowUseCase } from "../../domain/use-cases/send-manager-report-now.use-case";
import { Envs } from "../../config/envs";
import { TwilioManagerReportMessagingAdapter } from "../../infrastructure/messaging/twilio-manager-report-messaging.adapter";
import { PrismaManagerReportSubscriptionRepository } from "../../infrastructure/repositories/prisma-manager-report-subscription.repository";
import { PrismaWhatsAppConversationRepository } from "../../infrastructure/repositories/prisma-whatsapp-conversation.repository";
import { HmacManagerReportDocumentLinkAdapter } from "../../infrastructure/security/hmac-manager-report-document-link.adapter";
import { GetWhatsAppConversationWindowUseCase } from "../../domain/use-cases/get-whatsapp-conversation-window.use-case";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { ReportSubscriptionsController } from "./report-subscriptions.controller";

export class ReportSubscriptionsRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new PrismaManagerReportSubscriptionRepository();
    const documentLinks = new HmacManagerReportDocumentLinkAdapter(
      Envs.quoteDocumentSigningSecret,
      Envs.quoteDocumentUrlTtlSeconds,
    );
    const controller = new ReportSubscriptionsController(
      new ManagerReportSubscriptionsUseCase(repository),
      new SendManagerReportNowUseCase(
        repository,
        new TwilioManagerReportMessagingAdapter({
          enabled: Envs.twilioWhatsAppEnabled,
          accountSid: Envs.twilioAccountSid,
          authToken: Envs.twilioAuthToken,
          from: Envs.twilioWhatsAppFrom,
          contentSid: Envs.twilioManagerReportContentSid,
          mediaVariable: Envs.twilioManagerReportMediaVariable,
          statusCallbackUrl: Envs.twilioStatusCallbackUrl,
        }),
        documentLinks,
        new GetWhatsAppConversationWindowUseCase(
          new PrismaWhatsAppConversationRepository(),
          Envs.twilioWhatsAppFrom,
        ),
        Envs.publicApiUrl,
      ),
    );
    const access = [requireAuth, requireRoles("ADMIN")] as const;

    router.get("/", ...access, controller.list);
    router.post("/", ...access, controller.create);
    router.patch("/:id", ...access, controller.update);
    router.patch("/:id/status", ...access, controller.setActive);
    router.post("/:id/send-now", ...access, controller.sendNow);

    return router;
  }
}
