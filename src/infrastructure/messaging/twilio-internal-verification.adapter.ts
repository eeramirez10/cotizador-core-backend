import twilio from "twilio";
import { WhatsAppInternalVerificationPort } from "../../domain/contracts/whatsapp-internal-verification.port";

interface TwilioInternalVerificationConfig {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  serviceSid: string;
}

export class TwilioInternalVerificationAdapter extends WhatsAppInternalVerificationPort {
  constructor(private readonly config: TwilioInternalVerificationConfig) {
    super();
  }

  async sendCode(phoneE164: string): Promise<void> {
    const service = this.service();
    await service.verifications.create({ to: phoneE164, channel: "sms" });
  }

  async checkCode(phoneE164: string, code: string): Promise<boolean> {
    const service = this.service();
    const result = await service.verificationChecks.create({ to: phoneE164, code });
    return result.status === "approved";
  }

  private service() {
    if (
      !this.config.enabled
      || !this.config.accountSid
      || !this.config.authToken
      || !this.config.serviceSid
    ) {
      throw new Error("INTERNAL_WHATSAPP_VERIFICATION_NOT_CONFIGURED");
    }
    return twilio(this.config.accountSid, this.config.authToken)
      .verify.v2.services(this.config.serviceSid);
  }
}
