import { Envs } from "../config/envs";
import { ProcessWhatsAppAssistantJobUseCase } from "../domain/use-cases/process-whatsapp-assistant-job.use-case";
import { prisma } from "../infrastructure/database/prisma-client";
import { AiPlatformWhatsAppAssistantGateway } from "../infrastructure/http/ai-platform-whatsapp-assistant.gateway";
import { TwilioWhatsAppAssistantAdapter } from "../infrastructure/messaging/twilio-whatsapp-assistant.adapter";
import { PrismaWhatsAppAssistantRepository } from "../infrastructure/repositories/prisma-whatsapp-assistant.repository";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let stopping = false;

const processor = new ProcessWhatsAppAssistantJobUseCase(
  new PrismaWhatsAppAssistantRepository(),
  new AiPlatformWhatsAppAssistantGateway(
    Envs.aiPlatformBaseUrl,
    Envs.aiPlatformTimeoutMs,
    Envs.aiPlatformInternalApiKey,
  ),
  new TwilioWhatsAppAssistantAdapter({
    enabled: Envs.twilioWhatsAppEnabled && Envs.whatsAppAssistantEnabled,
    accountSid: Envs.twilioAccountSid,
    authToken: Envs.twilioAuthToken,
    from: Envs.twilioWhatsAppFrom,
    statusCallbackUrl: Envs.twilioStatusCallbackUrl,
  }),
  Envs.whatsAppAssistantMaxAttempts,
);

const shutdown = async (signal: string) => {
  if (stopping) return;
  stopping = true;
  console.log(JSON.stringify({ level: "info", event: "whatsapp_assistant.worker_stopping", signal }));
  await prisma.$disconnect();
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

const run = async (): Promise<void> => {
  console.log(JSON.stringify({
    level: "info",
    event: "whatsapp_assistant.worker_started",
    enabled: Envs.whatsAppAssistantEnabled,
  }));
  while (!stopping) {
    if (!Envs.whatsAppAssistantEnabled || !await processor.execute()) {
      await wait(Envs.whatsAppAssistantPollIntervalMs);
    }
  }
};

void run().catch(async (error) => {
  console.error(JSON.stringify({
    level: "error",
    event: "whatsapp_assistant.worker_crashed",
    message: error instanceof Error ? error.message : "Unknown worker error.",
  }));
  await prisma.$disconnect();
  process.exitCode = 1;
});
