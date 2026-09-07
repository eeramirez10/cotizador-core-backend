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
  messageVariable: string;
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
            [this.config.messageVariable]: this.templateMessage(message.messageBody),
            [this.config.mediaVariable]: message.documentToken,
          }),
        })
      : await this.sendFreeForm(client, common, message);

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
    const reservedVariables = ["1", "2", "3"];
    if (!/^\d+$/.test(this.config.messageVariable) || reservedVariables.includes(this.config.messageVariable)) {
      throw new Error("Twilio WhatsApp message variable must be a numeric template variable other than 1, 2, or 3.");
    }
    if (
      !/^\d+$/.test(this.config.mediaVariable)
      || reservedVariables.includes(this.config.mediaVariable)
      || this.config.mediaVariable === this.config.messageVariable
    ) {
      throw new Error("Twilio WhatsApp media variable must be different from the text template variables.");
    }
  }

  private freeFormBody(message: SendQuoteWhatsAppMessage): string {
    return message.messageBody;
  }

  private templateMessage(value: string): string {
    return value.replace(/\s+/g, " ").trim();
  }

  private async sendFreeForm(
    client: ReturnType<typeof twilio>,
    addresses: { to: string; from: string; statusCallback: string },
    message: SendQuoteWhatsAppMessage,
  ) {
    await client.messages.create({
      to: addresses.to,
      from: addresses.from,
      body: this.freeFormBody(message),
    });
    return client.messages.create({
      ...addresses,
      mediaUrl: [this.publicDocumentUrl(message.documentToken)],
    });
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
