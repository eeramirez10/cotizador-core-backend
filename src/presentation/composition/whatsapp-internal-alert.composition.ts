import { Envs } from "../../config/envs";
import { SendWhatsAppInternalAlertUseCase } from "../../domain/use-cases/send-whatsapp-internal-alert.use-case";
import { TwilioWhatsAppInternalAlertAdapter } from "../../infrastructure/messaging/twilio-whatsapp-internal-alert.adapter";
import { PrismaWhatsAppInternalAlertRepository } from "../../infrastructure/repositories/prisma-whatsapp-internal-alert.repository";

export const composeWhatsAppInternalAlert = (): SendWhatsAppInternalAlertUseCase => (
  new SendWhatsAppInternalAlertUseCase(
    new PrismaWhatsAppInternalAlertRepository(),
    new TwilioWhatsAppInternalAlertAdapter({
      enabled: Envs.twilioWhatsAppEnabled,
      accountSid: Envs.twilioAccountSid,
      authToken: Envs.twilioAuthToken,
      from: Envs.twilioWhatsAppFrom,
      contentSid: Envs.twilioWhatsAppInternalAlertContentSid,
      statusCallbackUrl: Envs.twilioStatusCallbackUrl,
    }),
  )
);
