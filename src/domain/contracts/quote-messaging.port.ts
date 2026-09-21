export interface SendQuoteWhatsAppMessage {
  recipient: string;
  contactName: string;
  sellerName: string;
  quoteNumber: string;
  documentToken: string;
  messageBody: string;
  deliveryMode: "FREE_FORM" | "TEMPLATE";
}

export interface QuoteMessageResult {
  providerMessageId: string;
  status: QuoteMessageStatus;
  errorMessage: string | null;
  templateSid: string | null;
  deliveryMode: "FREE_FORM" | "TEMPLATE";
}

export type QuoteMessageStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export interface QuoteMessageStatusResult {
  status: QuoteMessageStatus;
  errorMessage: string | null;
}

export abstract class QuoteMessagingPort {
  abstract sendWhatsAppQuote(message: SendQuoteWhatsAppMessage): Promise<QuoteMessageResult>;
  getWhatsAppMessageStatus?(providerMessageId: string): Promise<QuoteMessageStatusResult>;
}
