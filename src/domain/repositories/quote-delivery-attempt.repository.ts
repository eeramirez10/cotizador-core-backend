import type { QuoteDeliveryAttemptStatus, QuoteDeliveryChannel } from "../../infrastructure/database/generated/enums";

export interface QuoteDeliveryAttemptSummary {
  id: string;
  channel: QuoteDeliveryChannel;
  recipient: string;
  status: QuoteDeliveryAttemptStatus;
  errorMessage: string | null;
  sentAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
}

export abstract class QuoteDeliveryAttemptRepository {
  abstract listRecent(quoteId: string): Promise<QuoteDeliveryAttemptSummary[]>;
}
