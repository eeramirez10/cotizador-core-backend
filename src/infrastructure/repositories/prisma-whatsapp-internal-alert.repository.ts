import type { WhatsAppInternalAlertInput } from "../../domain/entities/whatsapp-internal-alert.entity";
import { WhatsAppInternalAlertRepository } from "../../domain/repositories/whatsapp-internal-alert.repository";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

export class PrismaWhatsAppInternalAlertRepository extends WhatsAppInternalAlertRepository {
  async findRecipient(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, whatsappPhoneE164: true, isActive: true },
    });
    return user ? {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      whatsappPhoneE164: user.whatsappPhoneE164,
      isActive: user.isActive,
    } : null;
  }

  async findConversationSellerId(conversationId: string): Promise<string | null> {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      select: {
        lead: { select: { assignedSellerId: true } },
        accesses: {
          where: { user: { role: "SELLER", isActive: true } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { userId: true },
        },
      },
    });
    return conversation?.lead?.assignedSellerId || conversation?.accesses[0]?.userId || null;
  }

  async findQuoteContext(quoteId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        quoteNumber: true,
        createdByUserId: true,
        customer: { select: { legalName: true, displayName: true } },
      },
    });
    if (!quote) return null;
    return {
      recipientUserId: quote.createdByUserId,
      customerName: quote.customer.legalName?.trim()
        || quote.customer.displayName.trim(),
      quoteNumber: quote.quoteNumber,
    };
  }

  async reserve(input: WhatsAppInternalAlertInput & { recipientUserId: string }) {
    try {
      const row = await prisma.whatsAppInternalAlert.create({
        data: {
          eventKey: input.eventKey,
          type: input.type,
          recipientUserId: input.recipientUserId,
          conversationId: input.conversationId || null,
          quoteId: input.quoteId || null,
          customerName: input.customerName || "Cliente",
          reference: input.reference,
          detail: input.detail,
          targetPath: input.targetPath || null,
        },
        select: { id: true },
      });
      return { id: row.id, created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.whatsAppInternalAlert.findUniqueOrThrow({
          where: { eventKey: input.eventKey },
          select: { id: true },
        });
        return { id: existing.id, created: false };
      }
      throw error;
    }
  }

  async markSent(id: string, providerMessageId: string, sentAt: Date): Promise<void> {
    await prisma.whatsAppInternalAlert.update({
      where: { id },
      data: { status: "SENT", providerMessageId, sentAt, errorMessage: null },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await prisma.whatsAppInternalAlert.update({
      where: { id },
      data: { status: "FAILED", errorMessage: errorMessage.slice(0, 2000) },
    });
  }

  async markSkipped(id: string, reason: string): Promise<void> {
    await prisma.whatsAppInternalAlert.update({
      where: { id },
      data: { status: "SKIPPED", errorMessage: reason.slice(0, 2000) },
    });
  }
}
