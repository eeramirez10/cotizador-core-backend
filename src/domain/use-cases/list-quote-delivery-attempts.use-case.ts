import type { UserRole } from "../../infrastructure/database/generated/enums";
import type { QuoteDeliveryAttemptRepository } from "../repositories/quote-delivery-attempt.repository";
import type { QuoteRepository } from "../repositories/quote.repository";

export class ListQuoteDeliveryAttemptsUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly attempts: QuoteDeliveryAttemptRepository,
  ) {}

  async execute(quoteId: string, actor: { id: string; role: UserRole; branchId: string }) {
    const quote = await this.quotes.findById({
      id: quoteId,
      scope: { role: actor.role, userId: actor.id, branchId: actor.branchId },
    });
    if (!quote) throw new Error("Quote not found.");
    return this.attempts.listRecent(quoteId);
  }
}
