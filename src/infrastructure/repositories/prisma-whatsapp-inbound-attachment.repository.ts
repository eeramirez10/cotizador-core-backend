import type { Prisma } from "../database/generated/client";
import type { WhatsAppInboxActor } from "../../domain/entities/whatsapp-inbox.entity";
import type { WhatsAppInboundAttachmentEntity } from "../../domain/entities/whatsapp-inbound-attachment.entity";
import { WhatsAppInboundAttachmentRepository } from "../../domain/repositories/whatsapp-inbound-attachment.repository";
import { prisma } from "../database/prisma-client";

const attachmentSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  quoteExtractedAt: true,
  quoteExtractionCount: true,
  quoteExtractedByUserId: true,
  quoteExtractedByName: true,
  lastQuoteDraftId: true,
} satisfies Prisma.WhatsAppInboundAttachmentSelect;

export class PrismaWhatsAppInboundAttachmentRepository extends WhatsAppInboundAttachmentRepository {
  async findByProviderMediaUrl(providerMediaUrl: string): Promise<WhatsAppInboundAttachmentEntity | null> {
    const row = await prisma.whatsAppInboundAttachment.findUnique({
      where: { providerMediaUrl },
      select: attachmentSelect,
    });
    return row;
  }

  async create(input: Parameters<WhatsAppInboundAttachmentRepository["create"]>[0]): Promise<WhatsAppInboundAttachmentEntity> {
    return prisma.whatsAppInboundAttachment.create({
      data: {
        inboundMessageId: input.inboundMessageId,
        providerMediaUrl: input.providerMediaUrl,
        originalName: input.file.originalName,
        storageKey: input.file.storageKey,
        mimeType: input.file.mimeType,
        sizeBytes: input.file.sizeBytes,
        checksumSha256: input.file.checksumSha256,
      },
      select: attachmentSelect,
    });
  }

  async findDownload(input: Parameters<WhatsAppInboundAttachmentRepository["findDownload"]>[0]) {
    return prisma.whatsAppInboundAttachment.findFirst({
      where: {
        id: input.attachmentId,
        inboundMessage: {
          conversation: { is: this.visibilityWhere(input.actor) },
        },
      },
      select: { id: true, originalName: true, mimeType: true, storageKey: true },
    });
  }

  async markQuoteExtraction(
    input: Parameters<WhatsAppInboundAttachmentRepository["markQuoteExtraction"]>[0],
  ): Promise<WhatsAppInboundAttachmentEntity | null> {
    const user = await prisma.user.findUnique({
      where: { id: input.actor.id },
      select: { firstName: true, lastName: true },
    });
    if (!user) return null;

    const updated = await prisma.whatsAppInboundAttachment.updateMany({
      where: {
        id: input.attachmentId,
        inboundMessage: {
          conversation: { is: this.visibilityWhere(input.actor) },
        },
      },
      data: {
        quoteExtractedAt: input.extractedAt,
        quoteExtractionCount: { increment: 1 },
        quoteExtractedByUserId: input.actor.id,
        quoteExtractedByName: `${user.firstName} ${user.lastName}`.trim(),
        lastQuoteDraftId: input.clientDraftId,
      },
    });
    if (updated.count === 0) return null;

    return prisma.whatsAppInboundAttachment.findUnique({
      where: { id: input.attachmentId },
      select: attachmentSelect,
    });
  }

  private visibilityWhere(actor: WhatsAppInboxActor): Prisma.WhatsAppConversationWhereInput {
    const customerConversation: Prisma.WhatsAppConversationWhereInput = {
      participantType: { not: "INTERNAL_USER" },
    };
    if (actor.role === "ADMIN") return customerConversation;
    if (actor.role === "MANAGER") {
      return {
        AND: [
          customerConversation,
          {
            OR: [
              { accesses: { some: { branchId: actor.branchId } } },
              { lead: { is: { assignedBranchId: actor.branchId } } },
              {
                participantType: "UNKNOWN",
                lead: { is: { assignedSellerId: null, status: { notIn: ["CONVERTED", "DISCARDED"] } } },
              },
            ],
          },
        ],
      };
    }
    return { ...customerConversation, accesses: { some: { userId: actor.id } } };
  }
}
