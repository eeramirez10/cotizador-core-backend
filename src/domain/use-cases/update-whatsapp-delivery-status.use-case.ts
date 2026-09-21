import type { QuoteDeliveryAttemptStatus } from "../../infrastructure/database/generated/enums";
import type { QuoteRepository } from "../repositories/quote.repository";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import { describeWhatsAppDeliveryError } from "../utils/whatsapp-delivery-error";

const STATUS_MAP: Record<string, QuoteDeliveryAttemptStatus> = {
  queued: "QUEUED",
  accepted: "QUEUED",
  sending: "QUEUED",
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
  undelivered: "FAILED",
};

export class UpdateWhatsAppDeliveryStatusUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly inboxRepository: WhatsAppInboxRepository,
    private readonly realtime?: WhatsAppRealtimePublisher,
  ) {}

  async execute(input: {
    providerMessageId: string;
    providerStatus: string;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<boolean> {
    const providerMessageId = input.providerMessageId.trim();
    const status = STATUS_MAP[input.providerStatus.trim().toLowerCase()];
    if (!providerMessageId || !status) return Promise.resolve(false);
    const details = describeWhatsAppDeliveryError(input.errorCode, input.errorMessage);
    const occurredAt = new Date();
    const [quoteUpdated, message] = await Promise.all([
      this.quoteRepository.updateDeliveryAttemptStatus({
        providerMessageId,
        status,
        errorMessage: status === "FAILED" ? details : null,
        occurredAt,
      }),
      this.inboxRepository.updateOutboundStatus({
        providerMessageId,
        status,
        errorMessage: status === "FAILED" ? details : null,
        occurredAt,
      }),
    ]);
    if (message) {
      void this.realtime?.publish({
        type: "WHATSAPP_CONVERSATION_CHANGED",
        conversationId: message.conversationId,
        reason: "MESSAGE_STATUS_CHANGED",
        occurredAt: occurredAt.toISOString(),
        messagePatch: { id: message.messageId, status, errorMessage: status === "FAILED" ? details : null },
      });
    }
    return quoteUpdated || Boolean(message);
  }
}
