import twilio from "twilio";
import {
  QuoteMessagingPort,
  type QuoteMessageResult,
  type SendQuoteWhatsAppMessage,
} from "../../domain/contracts/quote-messaging.port";

interface TwilioQuoteMessagingConfig {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  from: string;
  contentSid: string;
  mediaVariable: string;
  statusCallbackUrl: string;
}

export class TwilioQuoteMessagingAdapter extends QuoteMessagingPort {
  constructor(private readonly config: TwilioQuoteMessagingConfig) {
    super();
  }

  async sendWhatsAppQuote(message: SendQuoteWhatsAppMessage): Promise<QuoteMessageResult> {
    this.assertConfigured();
    const client = twilio(this.config.accountSid, this.config.authToken);
    const variables: Record<string, string> = {
      "1": message.contactName,
      "2": message.sellerName,
      "3": message.quoteNumber,
      [this.config.mediaVariable]: message.documentToken,
    };
    const result = await client.messages.create({
      to: this.whatsappAddress(message.recipient),
      from: this.whatsappAddress(this.config.from),
      contentSid: this.config.contentSid,
      contentVariables: JSON.stringify(variables),
      statusCallback: this.config.statusCallbackUrl,
    });

    return {
      providerMessageId: result.sid,
      status: result.status === "sent" ? "SENT" : "QUEUED",
      templateSid: this.config.contentSid,
    };
  }

  private assertConfigured(): void {
    if (!this.config.enabled) throw new Error("WhatsApp delivery is disabled.");
    if (!this.config.accountSid || !this.config.authToken || !this.config.from || !this.config.contentSid) {
      throw new Error("Twilio WhatsApp delivery is not configured.");
    }
    if (!/^HX[a-fA-F0-9]{32}$/.test(this.config.contentSid)) {
      throw new Error("Twilio WhatsApp template SID is invalid.");
    }
    if (!/^\d+$/.test(this.config.mediaVariable) || ["1", "2", "3"].includes(this.config.mediaVariable)) {
      throw new Error("Twilio WhatsApp media variable must be a numeric template variable other than 1, 2, or 3.");
    }
  }

  private whatsappAddress(value: string): string {
    const normalized = value.trim();
    return normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;
  }
}
