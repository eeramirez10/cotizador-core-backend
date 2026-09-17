import type { RecordedWhatsAppInboundMessage } from "../entities/whatsapp-conversation.entity";
import type { WhatsAppConversationRepository } from "../repositories/whatsapp-conversation.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import { WhatsAppPhone } from "../utils/whatsapp-phone";
import type { WhatsAppParticipantResolverPort } from "../contracts/whatsapp-participant-resolver.port";
import type { WhatsAppInboundMediaReference } from "../entities/whatsapp-inbound-attachment.entity";
import type { CaptureWhatsAppInboundMediaUseCase } from "./capture-whatsapp-inbound-media.use-case";

interface RecordInboundWhatsAppMessageInput {
  from: string;
  to: string;
  providerMessageId: string;
  body?: string;
  mediaCount?: number;
  media?: WhatsAppInboundMediaReference[];
}

export class RecordInboundWhatsAppMessageUseCase {
  constructor(
    private readonly repository: WhatsAppConversationRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly assistantEnabled = false,
    private readonly realtime?: WhatsAppRealtimePublisher,
    private readonly participantResolver?: WhatsAppParticipantResolverPort,
    private readonly captureMedia?: CaptureWhatsAppInboundMediaUseCase,
  ) {}

  async execute(input: RecordInboundWhatsAppMessageInput): Promise<RecordedWhatsAppInboundMessage> {
    const participant = WhatsAppPhone.create(input.from);
    if (!participant) throw new Error("Inbound WhatsApp sender is invalid.");
    const business = WhatsAppPhone.create(input.to);
    if (!business) throw new Error("Inbound WhatsApp recipient is invalid.");
    const providerMessageId = input.providerMessageId.trim();
    if (!providerMessageId || providerMessageId.length > 160) {
      throw new Error("Inbound WhatsApp message id is invalid.");
    }

    const receivedAt = this.now();
    const principal = this.participantResolver
      ? await this.participantResolver.resolve(participant.value)
      : {
          audience: "UNKNOWN" as const,
          userId: null,
          branchId: null,
        };
    const body = input.body?.trim() || null;
    const mediaCount = Math.max(0, Math.trunc(input.mediaCount || 0));
    const media = (input.media || []).slice(0, mediaCount);
    const recorded = await this.repository.recordInboundMessage({
      businessPhoneE164: business.value,
      participantPhoneE164: participant.value,
      providerMessageId,
      body,
      mediaCount,
      media,
      receivedAt,
      enqueueAssistant: this.assistantEnabled,
      participantType: principal.audience,
      internalUserId: principal.userId,
      internalUserBranchId: principal.branchId,
      principalResolvedAt: receivedAt,
    });
    const attachments = this.captureMedia && media.length > 0
      ? await this.captureMedia.execute({
          inboundMessageId: recorded.inboundMessageId,
          providerMessageId,
          media,
        })
      : [];
    if (recorded.created) {
      void this.realtime?.publish({
        type: "WHATSAPP_CONVERSATION_CHANGED",
        conversationId: recorded.conversationId,
        reason: "MESSAGE_RECEIVED",
        occurredAt: receivedAt.toISOString(),
        message: {
          id: recorded.inboundMessageId,
          conversationId: recorded.conversationId,
          direction: "INBOUND",
          authorType: "CUSTOMER",
          authorName: principal.audience === "INTERNAL_USER" ? principal.displayName : "Cliente",
          body: body || (mediaCount > 0 ? `Archivo recibido (${mediaCount})` : "Mensaje sin texto"),
          messageType: "TEXT",
          status: "RECEIVED",
          occurredAt: receivedAt.toISOString(),
          quote: null,
          fileAssetId: null,
          attachments: attachments.map((attachment) => ({
            ...attachment,
            createdAt: attachment.createdAt.toISOString(),
            quoteExtractedAt: attachment.quoteExtractedAt?.toISOString() || null,
          })),
        },
        conversation: {
          lastMessage: body || (mediaCount > 0 ? "Archivo recibido" : "Mensaje recibido"),
          lastMessageAt: receivedAt.toISOString(),
          lastInboundAt: receivedAt.toISOString(),
        },
      });
    }
    return recorded;
  }
}
