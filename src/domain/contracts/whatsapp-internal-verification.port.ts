export abstract class WhatsAppInternalVerificationPort {
  abstract sendCode(phoneE164: string): Promise<void>;
  abstract checkCode(phoneE164: string, code: string): Promise<boolean>;
}
