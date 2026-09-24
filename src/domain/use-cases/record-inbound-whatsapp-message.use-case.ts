import type { RecordedWhatsAppInboundMessage } from "../entities/whatsapp-conversation.entity";
import type { WhatsAppConversationRepository } from "../repositories/whatsapp-conversation.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import { WhatsAppPhone } from "../utils/whatsapp-phone";
import type { WhatsAppParticipantResolverPort } from "../contracts/whatsapp-participant-resolver.port";
import type { WhatsAppInboundMediaReference } from "../entities/whatsapp-inbound-attachment.entity";
import type { CaptureWhatsAppInboundMediaUseCase } from "./capture-whatsapp-inbound-media.use-case";
import type { WhatsAppAssistantPrincipal } from "../entities/whatsapp-assistant.entity";
import type { SendWhatsAppInternalAlertUseCase } from "./send-whatsapp-internal-alert.use-case";
import { resolveRuntimeValue, type RuntimeValue } from "../services/runtime-value";

interface RecordInboundWhatsAppMessageInput {
  from: string;
  to: string;
  providerMessageId: string;
  body?: string;
  mediaCount?: number;
  media?: WhatsAppInboundMediaReference[];
}

export const isUnsupportedWhatsAppAudio = (mimeType: string): boolean => {
  const normalized = mimeType.split(";", 1)[0].trim().toLowerCase();
  return normalized.startsWith("audio/") || normalized === "application/ogg";
};

export class RecordInboundWhatsAppMessageUseCase {
  constructor(
    private readonly repository: WhatsAppConversationRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly assistantEnabled: RuntimeValue<boolean> = false,
    private readonly realtime?: WhatsAppRealtimePublisher,
    private readonly participantResolver?: WhatsAppParticipantResolverPort,
    private readonly captureMedia?: CaptureWhatsAppInboundMediaUseCase,
    private readonly internalAlerts?: SendWhatsAppInternalAlertUseCase,
    private readonly humanResponseGraceMs: RuntimeValue<number> = 5 * 60 * 1000,
    private readonly humanControlMaxDurationMs: RuntimeValue<number> = 60 * 60 * 1000,
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
    const principal: WhatsAppAssistantPrincipal = this.participantResolver
      ? await this.participantResolver.resolve(participant.value)
      : {
          audience: "UNKNOWN" as const,
          displayName: "Usuario de WhatsApp",
          phoneE164: participant.value,
          userId: null,
          role: null,
          branchId: null,
          branchName: null,
          reportScope: null,
          reportBranchId: null,
          reportRange: null,
          isVerified: false,
        };
    const body = input.body?.trim() || null;
    const mediaCount = Math.max(0, Math.trunc(input.mediaCount || 0));
    const media = (input.media || []).slice(0, mediaCount);
    const hasUnsupportedAudio = media.some((item) => isUnsupportedWhatsAppAudio(item.mimeType));
    const supportedMedia = media.filter((item) => !isUnsupportedWhatsAppAudio(item.mimeType));
    const fallbackBody = hasUnsupportedAudio && supportedMedia.length === 0 ? "Nota de voz recibida (no compatible)" : `Archivo recibido (${mediaCount})`;
    const recorded = await this.repository.recordInboundMessage({
      businessPhoneE164: business.value,
      participantPhoneE164: participant.value,
      providerMessageId,
      body,
      mediaCount,
      hasUnsupportedAudio,
      media: supportedMedia,
      receivedAt,
      enqueueAssistant: resolveRuntimeValue(this.assistantEnabled),
      participantType: principal.audience,
      internalUserId: principal.userId,
      internalUserBranchId: principal.branchId,
      customerId: principal.customerId ?? null,
      customerContactId: principal.customerContactId ?? null,
      customerOwnerUserId: principal.customerOwnerUserId ?? null,
      customerOwnerBranchId: principal.customerOwnerBranchId ?? null,
      customerQuoteId: principal.customerQuoteId ?? null,
      customerName: principal.customerName ?? null,
      customerContactName: principal.customerContactName ?? null,
      principalResolvedAt: receivedAt,
      humanResponseGraceMs: resolveRuntimeValue(this.humanResponseGraceMs),
      humanControlMaxDurationMs: resolveRuntimeValue(this.humanControlMaxDurationMs),
    });
    const attachments = this.captureMedia && supportedMedia.length > 0
      ? await this.captureMedia.execute({
          inboundMessageId: recorded.inboundMessageId,
          providerMessageId,
          media: supportedMedia,
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
          authorName: principal.audience === "UNKNOWN" ? "Cliente" : principal.displayName,
          body: body
            ? hasUnsupportedAudio ? `${body}\nNota de voz no compatible` : body
            : mediaCount > 0 ? fallbackBody : "Mensaje sin texto",
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
          lastMessage: body || (mediaCount > 0 ? hasUnsupportedAudio && supportedMedia.length === 0 ? "Nota de voz no compatible" : "Archivo recibido" : "Mensaje recibido"),
          lastMessageAt: receivedAt.toISOString(),
          lastInboundAt: receivedAt.toISOString(),
          humanControlExpiresAt: recorded.humanControlExpiresAt?.toISOString() || null,
        },
      });
      if (attachments.length > 0) {
        await this.internalAlerts?.execute({
          eventKey: `file-review:${recorded.inboundMessageId}`,
          type: "FILE_REVIEW_REQUIRED",
          conversationId: recorded.conversationId,
          customerName: principal.customerName || principal.displayName || "Cliente de WhatsApp",
          reference: attachments.map((attachment) => attachment.originalName).join(", "),
          detail: attachments.length === 1
            ? `Revisa el archivo ${attachments[0].originalName} enviado por el cliente.`
            : `Revisa los ${attachments.length} archivos enviados por el cliente.`,
        });
      }
    }
    return recorded;
  }
}
