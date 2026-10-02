import { QuoteDeliveryAttemptRepository } from "../../domain/repositories/quote-delivery-attempt.repository";
import { prisma } from "../database/prisma-client";

export class PrismaQuoteDeliveryAttemptRepository extends QuoteDeliveryAttemptRepository {
  listRecent(quoteId: string) {
    return prisma.quoteDeliveryAttempt.findMany({
      where: { quoteId },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        channel: true,
        recipient: true,
        status: true,
        errorMessage: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        failedAt: true,
      },
    });
  }
}
