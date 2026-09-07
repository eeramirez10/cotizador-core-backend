import twilio from "twilio";
import {
  QuoteMessagingPort,
  type QuoteMessageResult,
  type SendQuoteWhatsAppMessage,
} from "../../domain/contracts/quote-messaging.port";

interface TwilioQuoteMessagingConfig {
  enabled: boolean;
  useTemplate: boolean;
  accountSid: string;
  authToken: string;
  from: string;
  contentSid: string;
  mediaVariable: string;
  publicApiUrl: string;
  statusCallbackUrl: string;
}

export class TwilioQuoteMessagingAdapter extends QuoteMessagingPort {
  constructor(private readonly config: TwilioQuoteMessagingConfig) {
    super();
  }

  async sendWhatsAppQuote(message: SendQuoteWhatsAppMessage): Promise<QuoteMessageResult> {
    this.assertConfigured();
    const client = twilio(this.config.accountSid, this.config.authToken);
    const common = {
      to: this.whatsappAddress(message.recipient),
      from: this.whatsappAddress(this.config.from),
      statusCallback: this.config.statusCallbackUrl,
    };
    const result = this.config.useTemplate
      ? await client.messages.create({
          ...common,
          contentSid: this.config.contentSid,
          contentVariables: JSON.stringify({
            "1": message.contactName,
            "2": message.sellerName,
            "3": message.quoteNumber,
            [this.config.mediaVariable]: message.documentToken,
          }),
        })
      : await client.messages.create({
          ...common,
          body: this.freeFormBody(message),
          mediaUrl: [this.publicDocumentUrl(message.documentToken)],
        });

    return {
      providerMessageId: result.sid,
      status: result.status === "sent" ? "SENT" : "QUEUED",
      templateSid: this.config.useTemplate ? this.config.contentSid : null,
    };
  }

  private assertConfigured(): void {
    if (!this.config.enabled) throw new Error("WhatsApp delivery is disabled.");
    if (!this.config.accountSid || !this.config.authToken || !this.config.from || !this.config.publicApiUrl) {
      throw new Error("Twilio WhatsApp delivery is not configured.");
    }
    if (!this.config.useTemplate) return;
    if (!this.config.contentSid) throw new Error("Twilio WhatsApp template is not configured.");
    if (!/^HX[a-fA-F0-9]{32}$/.test(this.config.contentSid)) {
      throw new Error("Twilio WhatsApp template SID is invalid.");
    }
    if (!/^\d+$/.test(this.config.mediaVariable) || ["1", "2", "3"].includes(this.config.mediaVariable)) {
      throw new Error("Twilio WhatsApp media variable must be a numeric template variable other than 1, 2, or 3.");
    }
  }

  private freeFormBody(message: SendQuoteWhatsAppMessage): string {
    return [
      `Hola ${message.contactName}, soy ${message.sellerName}, ejecutivo de ventas de Tuvansa.`,
      "",
      `Te envío la cotización ${message.quoteNumber} para tu revisión.`,
      "",
      "Puedes consultar el documento adjunto. Si tienes alguna duda o necesitas algún cambio, responde a este mensaje.",
    ].join("\n");
  }

  private publicDocumentUrl(token: string): string {
    const baseUrl = this.config.publicApiUrl.replace(/\/+$/, "");
    return `${baseUrl}/api/public/quote-documents/${encodeURIComponent(token)}`;
  }

  private whatsappAddress(value: string): string {
    const normalized = value.trim();
    return normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;
  }
}
