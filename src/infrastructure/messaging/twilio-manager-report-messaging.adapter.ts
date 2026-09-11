import twilio from "twilio";
import {
  ManagerReportMessagingPort,
  type ManagerReportMessageResult,
  type SendManagerReportMessage,
} from "../../domain/contracts/manager-report-messaging.port";

interface TwilioManagerReportMessagingConfig {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  from: string;
  contentSid: string;
  mediaVariable: string;
  statusCallbackUrl: string;
}

export class TwilioManagerReportMessagingAdapter extends ManagerReportMessagingPort {
  constructor(private readonly config: TwilioManagerReportMessagingConfig) {
    super();
  }

  async send(message: SendManagerReportMessage): Promise<ManagerReportMessageResult> {
    this.assertConfigured();
    const useTemplate = message.deliveryMode === "TEMPLATE";
    if (useTemplate) this.assertTemplateConfigured();
    const client = twilio(this.config.accountSid, this.config.authToken);
    const common = {
      to: this.whatsappAddress(message.recipient),
      from: this.whatsappAddress(this.config.from),
      statusCallback: this.config.statusCallbackUrl,
    };
    const result = useTemplate
      ? await client.messages.create({
          ...common,
          contentSid: this.config.contentSid,
          contentVariables: JSON.stringify({
            "1": message.recipientName,
            "2": message.periodLabel,
            [this.config.mediaVariable]: message.reportUrl,
          }),
        })
      : await client.messages.create({
          ...common,
          body: message.messageBody,
          mediaUrl: [message.reportUrl],
        });

    return {
      providerMessageId: result.sid,
      status: result.status === "sent" ? "SENT" : "QUEUED",
      templateSid: useTemplate ? this.config.contentSid : null,
      deliveryMode: message.deliveryMode,
    };
  }

  private assertConfigured(): void {
    if (!this.config.enabled) throw new Error("WhatsApp delivery is disabled.");
    if (!this.config.accountSid || !this.config.authToken || !this.config.from) {
      throw new Error("Twilio WhatsApp delivery is not configured.");
    }
  }

  private assertTemplateConfigured(): void {
    if (!/^HX[a-fA-F0-9]{32}$/.test(this.config.contentSid)) {
      throw new Error("The approved manager report WhatsApp template is not configured.");
    }
    if (!/^\d+$/.test(this.config.mediaVariable) || ["1", "2"].includes(this.config.mediaVariable)) {
      throw new Error("The manager report media variable must be numeric and different from 1 and 2.");
    }
  }

  private whatsappAddress(value: string): string {
    const normalized = value.trim();
    return normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;
  }
}
