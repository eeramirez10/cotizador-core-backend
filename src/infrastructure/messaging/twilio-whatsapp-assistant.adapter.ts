import twilio from "twilio";
import { assertStagingRecipientAllowed } from "./staging-recipient-guard";
import {
  WhatsAppAssistantMessagingPort,
  type WhatsAppAssistantReplyResult,
} from "../../domain/contracts/whatsapp-assistant-messaging.port";

interface Config {
  enabled: boolean | (() => boolean);
  accountSid: string;
  authToken: string;
  from: string;
  statusCallbackUrl: string;
}

export class TwilioWhatsAppAssistantAdapter extends WhatsAppAssistantMessagingPort {
  constructor(private readonly config: Config) {
    super();
  }

  async sendReply(recipient: string, body: string): Promise<WhatsAppAssistantReplyResult> {
    assertStagingRecipientAllowed(recipient);
    const enabled = typeof this.config.enabled === "function" ? this.config.enabled() : this.config.enabled;
    if (!enabled || !this.config.accountSid || !this.config.authToken || !this.config.from) {
      throw new Error("Twilio WhatsApp assistant is not configured.");
    }
    const result = await twilio(this.config.accountSid, this.config.authToken).messages.create({
      from: this.address(this.config.from),
      to: this.address(recipient),
      body,
      statusCallback: this.config.statusCallbackUrl,
    });
    return { providerMessageId: result.sid };
  }

  private address(value: string): string {
    const normalized = value.trim();
    return normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;
  }
}
