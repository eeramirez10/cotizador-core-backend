import type { WhatsAppInternalAlertMessagingPort } from "../contracts/whatsapp-internal-alert-messaging.port";
import type {
  WhatsAppInternalAlertInput,
  WhatsAppInternalAlertType,
} from "../entities/whatsapp-internal-alert.entity";
import type { WhatsAppInternalAlertRepository } from "../repositories/whatsapp-internal-alert.repository";

const labels: Record<WhatsAppInternalAlertType, string> = {
  LEAD_ASSIGNED: "Nuevo prospecto asignado",
  INFORMATION_REQUESTED: "Solicitud de información",
  QUOTE_CHANGE_REQUESTED: "Solicitud de modificación",
  QUOTE_ACCEPTED: "Cotización aceptada",
  QUOTE_REJECTED: "Cotización rechazada",
  FILE_REVIEW_REQUIRED: "Archivo nuevo que requiere revisión",
};

export class SendWhatsAppInternalAlertUseCase {
  constructor(
    private readonly repository: WhatsAppInternalAlertRepository,
    private readonly messaging: WhatsAppInternalAlertMessagingPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: WhatsAppInternalAlertInput): Promise<{ sent: boolean; duplicate?: boolean; reason?: string }> {
    const quoteContext = input.quoteId ? await this.repository.findQuoteContext(input.quoteId) : null;
    const recipientUserId = input.recipientUserId
      || quoteContext?.recipientUserId
      || (input.conversationId ? await this.repository.findConversationSellerId(input.conversationId) : null);
    if (!recipientUserId) return { sent: false, reason: "NO_ASSIGNED_SELLER" };

    const recipient = await this.repository.findRecipient(recipientUserId);
    if (!recipient?.isActive) return { sent: false, reason: "RECIPIENT_NOT_AVAILABLE" };

    const normalized = this.normalize({
      ...input,
      customerName: input.customerName || quoteContext?.customerName || "Cliente",
      reference: input.reference || quoteContext?.quoteNumber || "Cotizador Tuvansa",
    });
    const reservation = await this.repository.reserve({ ...normalized, recipientUserId });
    if (!reservation.created) return { sent: false, duplicate: true };

    if (!recipient.whatsappPhoneE164) {
      await this.repository.markSkipped(reservation.id, "The recipient has no WhatsApp phone configured.");
      return { sent: false, reason: "RECIPIENT_HAS_NO_WHATSAPP" };
    }
    if (!this.messaging.isConfigured()) {
      await this.repository.markSkipped(reservation.id, "The internal WhatsApp alert template is not configured.");
      return { sent: false, reason: "MESSAGING_NOT_CONFIGURED" };
    }

    try {
      const delivery = await this.messaging.send({
        recipient: recipient.whatsappPhoneE164,
        sellerName: recipient.name,
        eventLabel: labels[input.type],
        customerName: normalized.customerName,
        reference: normalized.reference,
        detail: normalized.detail,
      });
      await this.repository.markSent(reservation.id, delivery.providerMessageId, this.now());
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal WhatsApp alert failed.";
      await this.repository.markFailed(reservation.id, message);
      console.error("whatsapp_internal_alert_failed", {
        eventKey: normalized.eventKey,
        type: normalized.type,
        recipientUserId,
        message,
      });
      return { sent: false, reason: "DELIVERY_FAILED" };
    }
  }

  private normalize(input: WhatsAppInternalAlertInput): WhatsAppInternalAlertInput & { customerName: string } {
    return {
      ...input,
      eventKey: this.text(input.eventKey, 220),
      customerName: this.text(input.customerName || "Cliente", 260),
      reference: this.text(input.reference, 160),
      detail: this.text(input.detail, 500),
      conversationId: input.conversationId || null,
      quoteId: input.quoteId || null,
    };
  }

  private text(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, " ").trim();
    return (normalized || "Sin información").slice(0, maxLength);
  }
}
