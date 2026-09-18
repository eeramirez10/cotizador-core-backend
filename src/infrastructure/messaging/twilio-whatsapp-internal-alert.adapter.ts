import twilio from "twilio";
import {
  WhatsAppInternalAlertMessagingPort,
  type WhatsAppInternalAlertDelivery,
  type WhatsAppInternalAlertMessage,
} from "../../domain/contracts/whatsapp-internal-alert-messaging.port";

interface Config {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  from: string;
  contentSid: string;
  statusCallbackUrl: string;
}

export class TwilioWhatsAppInternalAlertAdapter extends WhatsAppInternalAlertMessagingPort {
  constructor(private readonly config: Config) {
    super();
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.enabled
      && this.config.accountSid
      && this.config.authToken
      && this.config.from
      && /^HX[a-fA-F0-9]{32}$/.test(this.config.contentSid),
    );
  }

  async send(message: WhatsAppInternalAlertMessage): Promise<WhatsAppInternalAlertDelivery> {
    if (!this.isConfigured()) throw new Error("The internal WhatsApp alert template is not configured.");
    const result = await twilio(this.config.accountSid, this.config.authToken).messages.create({
      from: this.address(this.config.from),
      to: this.address(message.recipient),
      contentSid: this.config.contentSid,
      contentVariables: JSON.stringify({
        "1": message.sellerName,
        "2": message.eventLabel,
        "3": message.customerName,
        "4": message.reference,
        "5": message.detail,
      }),
      statusCallback: this.config.statusCallbackUrl || undefined,
    });
    return { providerMessageId: result.sid };
  }

  private address(value: string): string {
    const normalized = value.trim();
    return normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;
  }
}
