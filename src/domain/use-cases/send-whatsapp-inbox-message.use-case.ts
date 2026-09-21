import type { WhatsAppAssistantMessagingPort } from "../contracts/whatsapp-assistant-messaging.port";
import type { WhatsAppInboxActor } from "../entities/whatsapp-inbox.entity";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import { resolveRuntimeValue, type RuntimeValue } from "../services/runtime-value";

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000;

export class SendWhatsAppInboxMessageUseCase {
  constructor(
    private readonly repository: WhatsAppInboxRepository,
    private readonly messaging: WhatsAppAssistantMessagingPort,
    private readonly now: () => Date = () => new Date(),
    private readonly realtime?: WhatsAppRealtimePublisher,
    private readonly humanTakeoverDurationMs: RuntimeValue<number> = 15 * 60 * 1000,
    private readonly humanTakeoverMaxDurationMs: RuntimeValue<number> = 60 * 60 * 1000,
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
    const sentAt = this.now();
    if (conversation.mode !== "HUMAN") {
      throw new Error("Toma el control de la conversación antes de responder manualmente.");
    }
    if (conversation.handledByUserId !== input.actor.id) {
      throw new Error("La conversación está bajo el control de otro usuario.");
    }
    if (!conversation.humanControlExpiresAt || conversation.humanControlExpiresAt <= sentAt) {
      throw new Error("El tiempo de control humano venció. Toma nuevamente la conversación para responder.");
    }

    const windowExpiresAt = conversation.lastInboundAt
      ? conversation.lastInboundAt.getTime() + WINDOW_DURATION_MS
      : 0;
    if (windowExpiresAt <= sentAt.getTime()) {
      throw new Error("La ventana de atención de 24 horas terminó. El cliente debe enviar un nuevo mensaje.");
    }

    const delivery = await this.messaging.sendReply(conversation.participantPhone, body);
    const message = await this.repository.recordManualMessage({
      messageId: input.clientMessageId,
      conversationId: conversation.id,
      providerMessageId: delivery.providerMessageId,
      body,
      sentByUserId: input.actor.id,
      sentAt,
    });
    const humanControlExpiresAt = await this.repository.renewHumanControl({
      conversationId: conversation.id,
      actor: input.actor,
      activityAt: sentAt,
      leaseDurationMs: resolveRuntimeValue(this.humanTakeoverDurationMs),
      maxDurationMs: resolveRuntimeValue(this.humanTakeoverMaxDurationMs),
    }).catch((error) => {
      console.error("whatsapp_human_control_renew_failed", error);
      return conversation.humanControlExpiresAt;
    });
    void this.realtime?.publish({
      type: "WHATSAPP_CONVERSATION_CHANGED",
      conversationId: conversation.id,
      reason: "MESSAGE_SENT",
      occurredAt: sentAt.toISOString(),
      message: {
        ...message,
        occurredAt: message.occurredAt.toISOString(),
        attachments: message.attachments.map((attachment) => ({
          ...attachment,
          createdAt: attachment.createdAt.toISOString(),
          quoteExtractedAt: attachment.quoteExtractedAt?.toISOString() || null,
        })),
      },
      conversation: {
        lastMessage: body,
        lastMessageAt: sentAt.toISOString(),
        humanControlExpiresAt: humanControlExpiresAt?.toISOString() || null,
        humanLastActivityAt: sentAt.toISOString(),
      },
    });
    return { providerMessageId: delivery.providerMessageId, sentAt };
  }
}
