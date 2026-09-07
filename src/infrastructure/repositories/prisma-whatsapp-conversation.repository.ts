import type { RecordWhatsAppInboundMessageInput } from "../../domain/entities/whatsapp-conversation.entity";
import { WhatsAppConversationRepository } from "../../domain/repositories/whatsapp-conversation.repository";
import { prisma } from "../database/prisma-client";

export class PrismaWhatsAppConversationRepository extends WhatsAppConversationRepository {
  async findByParticipants(businessPhoneE164: string, participantPhoneE164: string) {
    return prisma.whatsAppConversation.findUnique({
      where: {
        businessPhoneE164_participantPhoneE164: { businessPhoneE164, participantPhoneE164 },
      },
      select: { businessPhoneE164: true, participantPhoneE164: true, lastInboundAt: true },
    });
  }

  async recordInboundMessage(input: RecordWhatsAppInboundMessageInput): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const conversation = await tx.whatsAppConversation.upsert({
        where: {
          businessPhoneE164_participantPhoneE164: {
            businessPhoneE164: input.businessPhoneE164,
            participantPhoneE164: input.participantPhoneE164,
          },
        },
        create: {
          businessPhoneE164: input.businessPhoneE164,
          participantPhoneE164: input.participantPhoneE164,
          lastInboundAt: input.receivedAt,
        },
        update: {},
        select: { id: true },
      });

      const inserted = await tx.whatsAppInboundMessage.createMany({
        data: [{
          conversationId: conversation.id,
          providerMessageId: input.providerMessageId,
          body: input.body,
          mediaCount: input.mediaCount,
          receivedAt: input.receivedAt,
        }],
        skipDuplicates: true,
      });
      if (inserted.count === 0) return;

      await tx.whatsAppConversation.updateMany({
        where: {
          id: conversation.id,
          lastInboundAt: { lt: input.receivedAt },
        },
        data: { lastInboundAt: input.receivedAt },
      });
    });
  }
}
