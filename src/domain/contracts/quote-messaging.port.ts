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
  status: "QUEUED" | "SENT";
  templateSid: string | null;
  deliveryMode: "FREE_FORM" | "TEMPLATE";
}

export abstract class QuoteMessagingPort {
  abstract sendWhatsAppQuote(message: SendQuoteWhatsAppMessage): Promise<QuoteMessageResult>;
}
