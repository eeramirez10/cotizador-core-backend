import type {
  WhatsAppInternalQuoteDetails,
  WhatsAppInternalQuoteScope,
  WhatsAppInternalQuoteSummary,
  WhatsAppInternalVerificationState,
} from "../entities/whatsapp-assistant.entity";

export abstract class WhatsAppInternalAssistantRepository {
  abstract getVerification(userId: string): Promise<WhatsAppInternalVerificationState | null>;
  abstract markVerificationRequested(userId: string, phoneE164: string, at: Date): Promise<void>;
  abstract markVerificationFailed(userId: string, phoneE164: string): Promise<void>;
  abstract markVerified(userId: string, phoneE164: string, at: Date, until: Date): Promise<void>;
  abstract listQuotes(input: {
    scope: WhatsAppInternalQuoteScope;
    limit: number;
    status: string | null;
  }): Promise<WhatsAppInternalQuoteSummary[]>;
  abstract findQuote(input: {
    scope: WhatsAppInternalQuoteScope;
    quoteNumber: string;
  }): Promise<WhatsAppInternalQuoteDetails | null>;
}
