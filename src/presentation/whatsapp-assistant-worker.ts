import { Envs } from "../config/envs";
import { ProcessWhatsAppAssistantJobUseCase } from "../domain/use-cases/process-whatsapp-assistant-job.use-case";
import { prisma } from "../infrastructure/database/prisma-client";
import { AiPlatformWhatsAppAssistantGateway } from "../infrastructure/http/ai-platform-whatsapp-assistant.gateway";
import { TwilioWhatsAppAssistantAdapter } from "../infrastructure/messaging/twilio-whatsapp-assistant.adapter";
import { PrismaWhatsAppAssistantRepository } from "../infrastructure/repositories/prisma-whatsapp-assistant.repository";
import { PrismaWhatsAppHumanControlRepository } from "../infrastructure/repositories/prisma-whatsapp-human-control.repository";
import { whatsAppRealtimeBus } from "../infrastructure/realtime/whatsapp-realtime.container";
import { ReleaseExpiredWhatsAppHumanControlsUseCase } from "../domain/use-cases/release-expired-whatsapp-human-controls.use-case";
import { runtimeSystemSettings } from "../infrastructure/config/runtime-system-settings";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const MAX_RETRY_DELAY_MS = 30_000;
let stopping = false;

const processor = new ProcessWhatsAppAssistantJobUseCase(
  new PrismaWhatsAppAssistantRepository(),
  new AiPlatformWhatsAppAssistantGateway(
    Envs.aiPlatformBaseUrl,
    Envs.aiPlatformTimeoutMs,
    Envs.aiPlatformInternalApiKey,
  ),
  new TwilioWhatsAppAssistantAdapter({
    enabled: () => Envs.twilioWhatsAppEnabled && runtimeSystemSettings.boolean("WHATSAPP_ASSISTANT_ENABLED"),
    accountSid: Envs.twilioAccountSid,
    authToken: Envs.twilioAuthToken,
    from: Envs.twilioWhatsAppFrom,
    statusCallbackUrl: Envs.twilioStatusCallbackUrl,
  }),
  Envs.whatsAppAssistantMaxAttempts,
  whatsAppRealtimeBus,
);
const releaseExpiredHumanControls = new ReleaseExpiredWhatsAppHumanControlsUseCase(
  new PrismaWhatsAppHumanControlRepository(),
  () => runtimeSystemSettings.boolean("WHATSAPP_ASSISTANT_ENABLED"),
  whatsAppRealtimeBus,
);

const shutdown = async (signal: string) => {
  if (stopping) return;
  stopping = true;
  console.log(JSON.stringify({ level: "info", event: "whatsapp_assistant.worker_stopping", signal }));
  await whatsAppRealtimeBus.close();
  await prisma.$disconnect();
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

const run = async (): Promise<void> => {
  console.log(JSON.stringify({
    level: "info",
    event: "whatsapp_assistant.worker_started",
    enabled: runtimeSystemSettings.boolean("WHATSAPP_ASSISTANT_ENABLED"),
  }));
  let consecutiveFailures = 0;
  while (!stopping) {
    try {
      await runtimeSystemSettings.refresh();
      await releaseExpiredHumanControls.execute();
      if (!runtimeSystemSettings.boolean("WHATSAPP_ASSISTANT_ENABLED") || !await processor.execute()) {
        await wait(Envs.whatsAppAssistantPollIntervalMs);
      }
      consecutiveFailures = 0;
    } catch (error) {
      consecutiveFailures += 1;
      const retryDelayMs = Math.min(
        Envs.whatsAppAssistantPollIntervalMs * (2 ** Math.min(consecutiveFailures, 5)),
        MAX_RETRY_DELAY_MS,
      );
      console.error(JSON.stringify({
        level: "error",
        event: "whatsapp_assistant.iteration_failed",
        message: error instanceof Error ? error.message : "Unknown worker iteration error.",
        retryDelayMs,
      }));
      if (!stopping) await wait(retryDelayMs);
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
