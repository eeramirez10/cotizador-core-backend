import type { Request, Response } from "express";
import twilio from "twilio";
import type { UpdateWhatsAppDeliveryStatusUseCase } from "../../domain/use-cases/update-whatsapp-delivery-status.use-case";

export class TwilioController {
  constructor(
    private readonly updateStatus: UpdateWhatsAppDeliveryStatusUseCase,
    private readonly authToken: string,
    private readonly statusCallbackUrl: string,
    private readonly incomingWebhookUrl: string,
  ) {}

  whatsappStatus = async (req: Request, res: Response): Promise<void> => {
    const signature = req.header("x-twilio-signature") || "";
    const params = this.stringParams(req.body);
    if (!this.isValidRequest(signature, this.statusCallbackUrl, params)) {
      res.status(403).json({ error: "Invalid Twilio signature." });
      return;
    }

    await this.updateStatus.execute({
      providerMessageId: params.MessageSid || params.SmsSid || "",
      providerStatus: params.MessageStatus || params.SmsStatus || "",
      errorCode: params.ErrorCode,
      errorMessage: params.ErrorMessage,
    });
    res.status(204).send();
  };

  whatsappIncoming = (req: Request, res: Response): void => {
    const signature = req.header("x-twilio-signature") || "";
    const params = this.stringParams(req.body);
    if (!this.isValidRequest(signature, this.incomingWebhookUrl, params)) {
      res.status(403).json({ error: "Invalid Twilio signature." });
      return;
    }

    res.type("text/xml").status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  };

  private stringParams(body: unknown): Record<string, string> {
    return Object.fromEntries(
      Object.entries((body || {}) as Record<string, unknown>).map(([key, value]) => [key, `${value ?? ""}`]),
    );
  }

  private isValidRequest(signature: string, url: string, params: Record<string, string>): boolean {
    return Boolean(this.authToken && signature && twilio.validateRequest(this.authToken, signature, url, params));
  }
}
