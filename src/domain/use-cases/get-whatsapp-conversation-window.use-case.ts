import type { WhatsAppConversationRepository } from "../repositories/whatsapp-conversation.repository";
import { WhatsAppPhone } from "../utils/whatsapp-phone";

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000;

export type WhatsAppDeliveryMode = "FREE_FORM" | "TEMPLATE";

export interface WhatsAppConversationWindowResult {
  active: boolean;
  deliveryMode: WhatsAppDeliveryMode;
  lastInboundAt: Date | null;
  expiresAt: Date | null;
}

export class GetWhatsAppConversationWindowUseCase {
  constructor(
    private readonly repository: WhatsAppConversationRepository,
    private readonly businessPhone: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(participantPhone: string): Promise<WhatsAppConversationWindowResult> {
    const business = WhatsAppPhone.create(this.businessPhone);
    if (!business) throw new Error("Twilio WhatsApp sender is not configured with a valid phone number.");
    const participant = WhatsAppPhone.create(participantPhone);
    if (!participant) throw new Error("A valid WhatsApp recipient is required.");

    const conversation = await this.repository.findByParticipants(business.value, participant.value);
    if (!conversation) {
      return { active: false, deliveryMode: "TEMPLATE", lastInboundAt: null, expiresAt: null };
    }

    const expiresAt = new Date(conversation.lastInboundAt.getTime() + WINDOW_DURATION_MS);
    const active = expiresAt.getTime() > this.now().getTime();
    return {
      active,
      deliveryMode: active ? "FREE_FORM" : "TEMPLATE",
      lastInboundAt: conversation.lastInboundAt,
      expiresAt,
    };
  }
}
