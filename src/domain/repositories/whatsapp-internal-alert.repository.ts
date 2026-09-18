import type {
  WhatsAppInternalAlertInput,
  WhatsAppInternalAlertRecipient,
} from "../entities/whatsapp-internal-alert.entity";

export abstract class WhatsAppInternalAlertRepository {
  abstract findRecipient(userId: string): Promise<WhatsAppInternalAlertRecipient | null>;
  abstract findConversationSellerId(conversationId: string): Promise<string | null>;
  abstract findQuoteContext(quoteId: string): Promise<{
    recipientUserId: string;
    customerName: string;
    quoteNumber: string;
  } | null>;
  abstract reserve(input: WhatsAppInternalAlertInput & { recipientUserId: string }): Promise<{
    id: string;
    created: boolean;
  }>;
  abstract markSent(id: string, providerMessageId: string, sentAt: Date): Promise<void>;
  abstract markFailed(id: string, errorMessage: string): Promise<void>;
  abstract markSkipped(id: string, reason: string): Promise<void>;
}
