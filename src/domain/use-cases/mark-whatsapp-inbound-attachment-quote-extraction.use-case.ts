import type { WhatsAppInboxActor } from "../entities/whatsapp-inbox.entity";
import type { WhatsAppInboundAttachmentRepository } from "../repositories/whatsapp-inbound-attachment.repository";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MarkWhatsAppInboundAttachmentQuoteExtractionUseCase {
  constructor(
    private readonly repository: WhatsAppInboundAttachmentRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(attachmentId: string, clientDraftId: string, actor: WhatsAppInboxActor) {
    if (actor.role !== "SELLER") throw new Error("Only SELLER can extract a quote from a WhatsApp attachment.");
    if (!UUID_PATTERN.test(attachmentId)) throw new Error("Attachment id must be a valid UUID.");

    const attachment = await this.repository.markQuoteExtraction({
      attachmentId,
      clientDraftId,
      actor,
      extractedAt: this.now(),
    });
    if (!attachment) throw new Error("WhatsApp attachment not found.");
    return attachment;
  }
}
