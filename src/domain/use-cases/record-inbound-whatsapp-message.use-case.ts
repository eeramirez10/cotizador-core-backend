import type { WhatsAppConversationRepository } from "../repositories/whatsapp-conversation.repository";
import { WhatsAppPhone } from "../utils/whatsapp-phone";

interface RecordInboundWhatsAppMessageInput {
  from: string;
  to: string;
  providerMessageId: string;
  body?: string;
  mediaCount?: number;
}

export class RecordInboundWhatsAppMessageUseCase {
  constructor(
    private readonly repository: WhatsAppConversationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: RecordInboundWhatsAppMessageInput): Promise<void> {
    const participant = WhatsAppPhone.create(input.from);
    if (!participant) throw new Error("Inbound WhatsApp sender is invalid.");
    const business = WhatsAppPhone.create(input.to);
    if (!business) throw new Error("Inbound WhatsApp recipient is invalid.");
    const providerMessageId = input.providerMessageId.trim();
    if (!providerMessageId || providerMessageId.length > 160) {
      throw new Error("Inbound WhatsApp message id is invalid.");
    }

    await this.repository.recordInboundMessage({
      businessPhoneE164: business.value,
      participantPhoneE164: participant.value,
      providerMessageId,
      body: input.body?.trim() || null,
      mediaCount: Math.max(0, Math.trunc(input.mediaCount || 0)),
      receivedAt: this.now(),
    });
  }
}
