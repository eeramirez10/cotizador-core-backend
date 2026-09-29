import { Envs } from "../../config/envs";
import { BuildManagerReportUseCase } from "../../domain/use-cases/build-manager-report.use-case";
import { GetWhatsAppConversationWindowUseCase } from "../../domain/use-cases/get-whatsapp-conversation-window.use-case";
import { SendManagerReportNowUseCase } from "../../domain/use-cases/send-manager-report-now.use-case";
import { PrismaAnalyticsDatasource } from "../datasources/prisma-analytics.datasource";
import { TwilioManagerReportMessagingAdapter } from "../messaging/twilio-manager-report-messaging.adapter";
import { AnalyticsRepositoryImpl } from "../repositories/analytics.repository-impl";
import { PrismaManagerReportSubscriptionRepository } from "../repositories/prisma-manager-report-subscription.repository";
import { PrismaWhatsAppConversationRepository } from "../repositories/prisma-whatsapp-conversation.repository";
import { HmacManagerReportDocumentLinkAdapter } from "../security/hmac-manager-report-document-link.adapter";

export const createManagerReportSender = (repository: PrismaManagerReportSubscriptionRepository) => new SendManagerReportNowUseCase(
  repository,
  new BuildManagerReportUseCase(new AnalyticsRepositoryImpl(new PrismaAnalyticsDatasource())),
  new TwilioManagerReportMessagingAdapter({
    enabled: Envs.twilioWhatsAppEnabled,
    accountSid: Envs.twilioAccountSid,
    authToken: Envs.twilioAuthToken,
    from: Envs.twilioWhatsAppFrom,
    contentSid: Envs.twilioManagerReportContentSid,
    mediaVariable: Envs.twilioManagerReportMediaVariable,
    statusCallbackUrl: Envs.twilioStatusCallbackUrl,
  }),
  new HmacManagerReportDocumentLinkAdapter(Envs.quoteDocumentSigningSecret, Envs.quoteDocumentUrlTtlSeconds),
  new GetWhatsAppConversationWindowUseCase(new PrismaWhatsAppConversationRepository(), Envs.twilioWhatsAppFrom),
  Envs.publicApiUrl,
);
