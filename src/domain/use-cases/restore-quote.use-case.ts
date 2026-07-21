import type { UserRole } from "../../infrastructure/database/generated/enums";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

interface Actor { id: string; role: UserRole }

export class RestoreQuoteUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(quoteId: string, actor: Actor): Promise<QuoteResponseDto> {
    if (actor.role !== "ADMIN") throw new Error("Only ADMIN can restore quotes.");
    const quote = await this.quoteRepository.restore({ id: quoteId, actorUserId: actor.id });
    if (!quote) throw new Error("Quote not found.");
    return new QuoteResponseDto(quote);
  }
}
