export interface SendQuoteWhatsAppMessage {
  recipient: string;
  contactName: string;
  sellerName: string;
  quoteNumber: string;
  documentToken: string;
}

export interface QuoteMessageResult {
  providerMessageId: string;
  status: "QUEUED" | "SENT";
  templateSid: string;
}

export abstract class QuoteMessagingPort {
  abstract sendWhatsAppQuote(message: SendQuoteWhatsAppMessage): Promise<QuoteMessageResult>;
}
