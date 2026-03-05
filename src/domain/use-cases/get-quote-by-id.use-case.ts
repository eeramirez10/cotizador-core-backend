import type { UserRole } from "../../infrastructure/database/generated/enums";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

interface GetQuoteByIdActorContext {
  role: UserRole;
  branchId: string;
}

export class GetQuoteByIdUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(id: string, actor: GetQuoteByIdActorContext): Promise<QuoteResponseDto> {
    const quote = await this.quoteRepository.findById({
      id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!quote) throw new Error("Quote not found.");
    return new QuoteResponseDto(quote);
  }
}
