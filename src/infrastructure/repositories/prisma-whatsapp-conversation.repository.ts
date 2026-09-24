import type {
  RecordWhatsAppInboundMessageInput,
  RecordedWhatsAppInboundMessage,
} from "../../domain/entities/whatsapp-conversation.entity";
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

  async recordInboundMessage(input: RecordWhatsAppInboundMessageInput): Promise<RecordedWhatsAppInboundMessage> {
    return prisma.$transaction(async (tx) => {
      const existingConversation = await tx.whatsAppConversation.findUnique({
        where: {
          businessPhoneE164_participantPhoneE164: {
            businessPhoneE164: input.businessPhoneE164,
            participantPhoneE164: input.participantPhoneE164,
          },
        },
        select: { participantType: true, internalUserId: true },
      });
      const principalChanged = Boolean(
        existingConversation
        && (
          existingConversation.participantType !== input.participantType
          || existingConversation.internalUserId !== input.internalUserId
        ),
      );
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
          lastMessageAt: input.receivedAt,
          participantType: input.participantType,
          internalUserId: input.internalUserId,
          principalResolvedAt: input.principalResolvedAt,
        },
        update: {
          participantType: input.participantType,
          internalUserId: input.internalUserId,
          principalResolvedAt: input.principalResolvedAt,
          ...(principalChanged ? { previousResponseId: null } : {}),
        },
        select: {
          id: true,
          mode: true,
          handledAt: true,
          humanControlExpiresAt: true,
        },
      });

      let humanControlExpiresAt = conversation.humanControlExpiresAt;
      if (conversation.mode === "HUMAN" && conversation.handledAt) {
        const maximum = new Date(conversation.handledAt.getTime() + input.humanControlMaxDurationMs);
        const grace = new Date(Math.min(
          input.receivedAt.getTime() + input.humanResponseGraceMs,
          maximum.getTime(),
        ));
        const adjusted = await tx.whatsAppConversation.updateMany({
          where: { id: conversation.id, mode: "HUMAN" },
          data: { humanControlExpiresAt: grace },
        });
        if (adjusted.count > 0) humanControlExpiresAt = grace;
      }

      if (input.participantType === "UNKNOWN") {
        await tx.whatsAppLead.upsert({
          where: { conversationId: conversation.id },
          create: {
            conversationId: conversation.id,
            phoneE164: input.participantPhoneE164,
          },
          update: { phoneE164: input.participantPhoneE164 },
        });
      } else if (input.participantType === "CUSTOMER") {
        if (input.customerId) {
          await tx.whatsAppLead.upsert({
            where: { conversationId: conversation.id },
            create: {
              conversationId: conversation.id,
              phoneE164: input.participantPhoneE164,
              contactName: input.customerContactName,
              companyName: input.customerName,
              status: "CONVERTED",
              customerId: input.customerId,
              assignedSellerId: input.customerOwnerUserId,
              assignedBranchId: input.customerOwnerBranchId,
              assignedAt: input.customerOwnerUserId ? input.receivedAt : null,
            },
            update: {
              phoneE164: input.participantPhoneE164,
              contactName: input.customerContactName,
              companyName: input.customerName,
              status: "CONVERTED",
              customerId: input.customerId,
              ...(input.customerOwnerUserId ? {
                assignedSellerId: input.customerOwnerUserId,
                assignedBranchId: input.customerOwnerBranchId,
                assignedAt: input.receivedAt,
              } : {}),
            },
          });
        } else {
          await tx.whatsAppLead.updateMany({
            where: { conversationId: conversation.id, status: { not: "DISCARDED" } },
            data: { status: "CONVERTED" },
          });
        }
      }

      if (input.internalUserId && input.internalUserBranchId) {
        await tx.whatsAppConversationAccess.upsert({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId: input.internalUserId,
            },
          },
          create: {
            conversationId: conversation.id,
            userId: input.internalUserId,
            branchId: input.internalUserBranchId,
          },
          update: { branchId: input.internalUserBranchId },
        });
      }

      if (
        input.participantType === "CUSTOMER"
        && input.customerId
        && input.customerOwnerUserId
        && input.customerOwnerBranchId
      ) {
        await tx.whatsAppConversationAccess.upsert({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId: input.customerOwnerUserId,
            },
          },
          create: {
            conversationId: conversation.id,
            userId: input.customerOwnerUserId,
            branchId: input.customerOwnerBranchId,
            customerId: input.customerId,
            customerContactId: input.customerContactId,
            quoteId: input.customerQuoteId,
          },
          update: {
            branchId: input.customerOwnerBranchId,
            customerId: input.customerId,
            customerContactId: input.customerContactId,
            quoteId: input.customerQuoteId,
          },
        });
      }

      const inserted = await tx.whatsAppInboundMessage.createMany({
        data: [{
          conversationId: conversation.id,
          providerMessageId: input.providerMessageId,
          body: input.body,
          mediaCount: input.mediaCount,
          hasUnsupportedAudio: input.hasUnsupportedAudio,
          receivedAt: input.receivedAt,
        }],
        skipDuplicates: true,
      });
      const inbound = await tx.whatsAppInboundMessage.findUniqueOrThrow({
        where: { providerMessageId: input.providerMessageId },
        select: { id: true },
      });
      if (inserted.count === 0) {
        return {
          conversationId: conversation.id,
          inboundMessageId: inbound.id,
          created: false,
          humanControlExpiresAt,
        };
      }

      if (input.enqueueAssistant && conversation.mode === "AI") {
        await tx.whatsAppAssistantJob.create({
          data: { conversationId: conversation.id, inboundMessageId: inbound.id },
        });
      }

      await tx.whatsAppConversation.updateMany({
        where: {
          id: conversation.id,
          OR: [
            { lastInboundAt: null },
            { lastInboundAt: { lt: input.receivedAt } },
          ],
        },
        data: { lastInboundAt: input.receivedAt, lastMessageAt: input.receivedAt },
      });
      return {
        conversationId: conversation.id,
        inboundMessageId: inbound.id,
        created: true,
        humanControlExpiresAt,
      };
    });
  }
}
