import {
  WhatsAppHumanControlRepository,
  type ReleasedWhatsAppHumanControl,
} from "../../domain/repositories/whatsapp-human-control.repository";
import type { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

export class PrismaWhatsAppHumanControlRepository extends WhatsAppHumanControlRepository {
  async releaseExpired(input: {
    now: Date;
    assistantEnabled: boolean;
  }): Promise<ReleasedWhatsAppHumanControl[]> {
    const candidates = await prisma.whatsAppConversation.findMany({
      where: {
        mode: "HUMAN",
        humanControlExpiresAt: { lte: input.now },
      },
      select: { id: true },
      take: 50,
    });

    const released: ReleasedWhatsAppHumanControl[] = [];
    for (const candidate of candidates) {
      const result = await prisma.$transaction(async (tx) => {
        const changed = await tx.whatsAppConversation.updateMany({
          where: {
            id: candidate.id,
            mode: "HUMAN",
            humanControlExpiresAt: { lte: input.now },
          },
          data: {
            mode: "AI",
            handledByUserId: null,
            handledAt: null,
            humanControlExpiresAt: null,
            humanLastActivityAt: null,
          },
        });
        if (changed.count === 0) return null;
        if (!input.assistantEnabled) {
          await this.recordExpirationAudit(tx, candidate.id, input.now, false);
          return { conversationId: candidate.id, assistantJobQueued: false };
        }

        const [latestInbound, latestHumanReply] = await Promise.all([
          tx.whatsAppInboundMessage.findFirst({
            where: { conversationId: candidate.id },
            orderBy: { receivedAt: "desc" },
            select: { id: true, receivedAt: true },
          }),
          tx.whatsAppOutboundMessage.findFirst({
            where: { conversationId: candidate.id, authorType: "USER" },
            orderBy: { sentAt: "desc" },
            select: { sentAt: true },
          }),
        ]);
        const unanswered = latestInbound
          && (!latestHumanReply || latestInbound.receivedAt > latestHumanReply.sentAt);
        if (!latestInbound || !unanswered) {
          await this.recordExpirationAudit(tx, candidate.id, input.now, false);
          return { conversationId: candidate.id, assistantJobQueued: false };
        }

        const existingJob = await tx.whatsAppAssistantJob.findUnique({
          where: { inboundMessageId: latestInbound.id },
          select: { id: true, status: true },
        });
        if (!existingJob) {
          await tx.whatsAppAssistantJob.create({
            data: {
              conversationId: candidate.id,
              inboundMessageId: latestInbound.id,
              nextAttemptAt: input.now,
            },
          });
          await this.recordExpirationAudit(tx, candidate.id, input.now, true);
          return { conversationId: candidate.id, assistantJobQueued: true };
        }
        if (["CANCELLED", "FAILED"].includes(existingJob.status)) {
          await tx.whatsAppAssistantJob.update({
            where: { id: existingJob.id },
            data: {
              status: "PENDING",
              attempts: 0,
              nextAttemptAt: input.now,
              lockedAt: null,
              completedAt: null,
              errorMessage: null,
            },
          });
          await this.recordExpirationAudit(tx, candidate.id, input.now, true);
          return { conversationId: candidate.id, assistantJobQueued: true };
        }
        await this.recordExpirationAudit(tx, candidate.id, input.now, false);
        return { conversationId: candidate.id, assistantJobQueued: false };
      });
      if (result) released.push(result);
    }
    return released;
  }

  private async recordExpirationAudit(
    tx: Prisma.TransactionClient,
    conversationId: string,
    expiredAt: Date,
    assistantJobQueued: boolean,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorUserId: null,
        entityType: "WHATSAPP_CONVERSATION",
        entityId: conversationId,
        action: "HUMAN_CONTROL_EXPIRED",
        payload: {
          expiredAt: expiredAt.toISOString(),
          assistantJobQueued,
        },
      },
    });
  }
}
