import type { WhatsAppAssistantAgentPort } from "../contracts/whatsapp-assistant-agent.port";
import type { WhatsAppAssistantMessagingPort } from "../contracts/whatsapp-assistant-messaging.port";
import type { WhatsAppAssistantRepository } from "../repositories/whatsapp-assistant.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";

export class ProcessWhatsAppAssistantJobUseCase {
  constructor(
    private readonly repository: WhatsAppAssistantRepository,
    private readonly agent: WhatsAppAssistantAgentPort,
    private readonly messaging: WhatsAppAssistantMessagingPort,
    private readonly maxAttempts: number,
    private readonly realtime?: WhatsAppRealtimePublisher,
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
        hasUnsupportedAudio: job.hasUnsupportedAudio,
        attachments: job.attachments,
        previousResponseId: job.previousResponseId,
        principal: job.principal,
      });
      if (!await this.repository.isConversationAiControlled(job.conversationId)) {
        await this.repository.cancelJob(
          job.id,
          "Cancelled because a user took control of the conversation.",
          new Date(),
        );
        return true;
      }
      const delivery = await this.messaging.sendReply(job.participantPhone, response.text);
      const sentAt = new Date();
      const completed = await this.repository.completeJob({
        jobId: job.id,
        conversationId: job.conversationId,
        responseId: response.responseId,
        body: response.text,
        providerMessageId: delivery.providerMessageId,
        sentAt,
      });
      void this.realtime?.publish({
        type: "WHATSAPP_CONVERSATION_CHANGED",
        conversationId: job.conversationId,
        reason: "MESSAGE_SENT",
        occurredAt: sentAt.toISOString(),
        message: {
          id: completed.outboundMessageId,
          conversationId: job.conversationId,
          direction: "OUTBOUND",
          authorType: "AI",
          authorName: "Asistente Tuvansa",
          body: response.text,
          messageType: "TEXT",
          status: "QUEUED",
          occurredAt: sentAt.toISOString(),
          quote: null,
          fileAssetId: null,
          attachments: [],
        },
        conversation: {
          lastMessage: response.text,
          lastMessageAt: sentAt.toISOString(),
        },
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
