import type { Request, Response } from "express";
import twilio from "twilio";
import type { UpdateWhatsAppDeliveryStatusUseCase } from "../../domain/use-cases/update-whatsapp-delivery-status.use-case";
import type { GetWhatsAppConversationWindowUseCase } from "../../domain/use-cases/get-whatsapp-conversation-window.use-case";
import type { RecordInboundWhatsAppMessageUseCase } from "../../domain/use-cases/record-inbound-whatsapp-message.use-case";

export class TwilioController {
  constructor(
    private readonly updateStatus: UpdateWhatsAppDeliveryStatusUseCase,
    private readonly recordInboundMessage: RecordInboundWhatsAppMessageUseCase,
    private readonly getConversationWindow: GetWhatsAppConversationWindowUseCase,
    private readonly authToken: string,
    private readonly statusCallbackUrl: string,
    private readonly incomingWebhookUrl: string,
  ) {}

  whatsappWindow = async (req: Request, res: Response): Promise<void> => {
    const phone = typeof req.query.phone === "string" ? req.query.phone : "";
    try {
      const result = await this.getConversationWindow.execute(phone);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid WhatsApp recipient." });
    }
  };

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

  whatsappIncoming = async (req: Request, res: Response): Promise<void> => {
    const signature = req.header("x-twilio-signature") || "";
    const params = this.stringParams(req.body);
    if (!this.isValidRequest(signature, this.incomingWebhookUrl, params)) {
      res.status(403).json({ error: "Invalid Twilio signature." });
      return;
    }

    try {
      await this.recordInboundMessage.execute({
        from: params.From,
        to: params.To,
        providerMessageId: params.MessageSid || params.SmsSid || "",
        body: params.Body,
        mediaCount: Number.parseInt(params.NumMedia || "0", 10) || 0,
        media: this.mediaParams(params),
      });
      res.type("text/xml").status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error) {
      console.error("twilio_inbound_record_failed", error);
      res.status(500).json({ error: "Could not register inbound WhatsApp message." });
    }
  };

  private stringParams(body: unknown): Record<string, string> {
    return Object.fromEntries(
      Object.entries((body || {}) as Record<string, unknown>).map(([key, value]) => [key, `${value ?? ""}`]),
    );
  }

  private mediaParams(params: Record<string, string>) {
    const count = Math.min(Math.max(Number.parseInt(params.NumMedia || "0", 10) || 0, 0), 10);
    return Array.from({ length: count }, (_, index) => ({
      index,
      url: params[`MediaUrl${index}`]?.trim() || "",
      mimeType: params[`MediaContentType${index}`]?.trim().toLowerCase() || "application/octet-stream",
    })).filter((media) => media.url.length > 0);
  }

  private isValidRequest(signature: string, url: string, params: Record<string, string>): boolean {
    return Boolean(this.authToken && signature && twilio.validateRequest(this.authToken, signature, url, params));
  }
}
