import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import type { WhatsAppHumanControlRepository } from "../repositories/whatsapp-human-control.repository";
import { resolveRuntimeValue, type RuntimeValue } from "../services/runtime-value";

export class ReleaseExpiredWhatsAppHumanControlsUseCase {
  constructor(
    private readonly repository: WhatsAppHumanControlRepository,
    private readonly assistantEnabled: RuntimeValue<boolean>,
    private readonly realtime?: WhatsAppRealtimePublisher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(): Promise<number> {
    const occurredAt = this.now();
    const released = await this.repository.releaseExpired({
      now: occurredAt,
      assistantEnabled: resolveRuntimeValue(this.assistantEnabled),
    });
    await Promise.all(released.map((conversation) => this.realtime?.publish({
      type: "WHATSAPP_CONVERSATION_CHANGED",
      conversationId: conversation.conversationId,
      reason: "CONVERSATION_MODE_CHANGED",
      occurredAt: occurredAt.toISOString(),
      conversation: {
        mode: "AI",
        handledByUserId: null,
        handledByName: null,
        humanControlExpiresAt: null,
        humanLastActivityAt: null,
      },
    })));
    return released.length;
  }
}
