import type { Request, Response } from "express";
import twilio from "twilio";
import type { UpdateWhatsAppDeliveryStatusUseCase } from "../../domain/use-cases/update-whatsapp-delivery-status.use-case";

export class TwilioController {
  constructor(
    private readonly updateStatus: UpdateWhatsAppDeliveryStatusUseCase,
    private readonly authToken: string,
    private readonly callbackUrl: string,
  ) {}

  whatsappStatus = async (req: Request, res: Response): Promise<void> => {
    const signature = req.header("x-twilio-signature") || "";
    const params = Object.fromEntries(
      Object.entries(req.body as Record<string, unknown>).map(([key, value]) => [key, `${value ?? ""}`]),
    );
    if (!this.authToken || !signature || !twilio.validateRequest(this.authToken, signature, this.callbackUrl, params)) {
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
}
