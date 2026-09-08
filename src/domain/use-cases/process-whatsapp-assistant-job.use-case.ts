import type { WhatsAppAssistantAgentPort } from "../contracts/whatsapp-assistant-agent.port";
import type { WhatsAppAssistantMessagingPort } from "../contracts/whatsapp-assistant-messaging.port";
import type { WhatsAppAssistantRepository } from "../repositories/whatsapp-assistant.repository";

export class ProcessWhatsAppAssistantJobUseCase {
  constructor(
    private readonly repository: WhatsAppAssistantRepository,
    private readonly agent: WhatsAppAssistantAgentPort,
    private readonly messaging: WhatsAppAssistantMessagingPort,
    private readonly maxAttempts: number,
  ) {}

  async execute(): Promise<boolean> {
    const job = await this.repository.claimNextJob(new Date(Date.now() - 5 * 60_000));
    if (!job) return false;
    try {
      const response = await this.agent.respond({
        turnId: job.id,
        conversationId: job.conversationId,
        participantPhone: job.participantPhone,
        message: job.message,
        mediaCount: job.mediaCount,
        previousResponseId: job.previousResponseId,
      });
      const delivery = await this.messaging.sendReply(job.participantPhone, response.text);
      await this.repository.completeJob({
        jobId: job.id,
        conversationId: job.conversationId,
        responseId: response.responseId,
        body: response.text,
        providerMessageId: delivery.providerMessageId,
        sentAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown WhatsApp assistant error.";
      const final = job.attempts >= this.maxAttempts;
      const backoffMs = Math.min(60_000, 2 ** Math.max(0, job.attempts - 1) * 2_000);
      await this.repository.failJob({
        jobId: job.id,
        errorMessage: message,
        retryAt: new Date(Date.now() + backoffMs),
        final,
      });
      console.error(JSON.stringify({ level: "error", event: "whatsapp_assistant.job_failed", jobId: job.id, final, message }));
    }
    return true;
  }
}
