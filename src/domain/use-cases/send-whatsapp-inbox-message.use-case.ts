import type { WhatsAppAssistantMessagingPort } from "../contracts/whatsapp-assistant-messaging.port";
import type { WhatsAppInboxActor } from "../entities/whatsapp-inbox.entity";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000;

export class SendWhatsAppInboxMessageUseCase {
  constructor(
    private readonly repository: WhatsAppInboxRepository,
    private readonly messaging: WhatsAppAssistantMessagingPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    conversationId: string;
    clientMessageId: string;
    body: string;
    actor: WhatsAppInboxActor;
  }): Promise<{ providerMessageId: string; sentAt: Date }> {
    const body = input.body.trim();
    if (!body) throw new Error("El mensaje es obligatorio.");
    if (body.length > 1600) throw new Error("El mensaje no puede exceder 1600 caracteres.");

    const conversation = await this.repository.findConversation({
      conversationId: input.conversationId,
      actor: input.actor,
    });
    if (!conversation) throw new Error("Conversación no encontrada.");
    if (conversation.mode !== "HUMAN") {
      throw new Error("Toma el control de la conversación antes de responder manualmente.");
    }

    const sentAt = this.now();
    const windowExpiresAt = conversation.lastInboundAt
      ? conversation.lastInboundAt.getTime() + WINDOW_DURATION_MS
      : 0;
    if (windowExpiresAt <= sentAt.getTime()) {
      throw new Error("La ventana de atención de 24 horas terminó. El cliente debe enviar un nuevo mensaje.");
    }

    const delivery = await this.messaging.sendReply(conversation.participantPhone, body);
    await this.repository.recordManualMessage({
      messageId: input.clientMessageId,
      conversationId: conversation.id,
      providerMessageId: delivery.providerMessageId,
      body,
      sentByUserId: input.actor.id,
      sentAt,
    });
    return { providerMessageId: delivery.providerMessageId, sentAt };
  }
}
