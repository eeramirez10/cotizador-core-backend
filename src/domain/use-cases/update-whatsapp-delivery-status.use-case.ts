import type { QuoteDeliveryAttemptStatus } from "../../infrastructure/database/generated/enums";
import type { QuoteRepository } from "../repositories/quote.repository";

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
  constructor(private readonly quoteRepository: QuoteRepository) {}

  execute(input: {
    providerMessageId: string;
    providerStatus: string;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<boolean> {
    const providerMessageId = input.providerMessageId.trim();
    const status = STATUS_MAP[input.providerStatus.trim().toLowerCase()];
    if (!providerMessageId || !status) return Promise.resolve(false);
    const details = [input.errorCode?.trim(), input.errorMessage?.trim()].filter(Boolean).join(": ") || null;
    return this.quoteRepository.updateDeliveryAttemptStatus({
      providerMessageId,
      status,
      errorMessage: status === "FAILED" ? details : null,
      occurredAt: new Date(),
    });
  }
}
