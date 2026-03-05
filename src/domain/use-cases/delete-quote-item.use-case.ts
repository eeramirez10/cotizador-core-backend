import type { UserRole } from "../../infrastructure/database/generated/enums";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

interface DeleteQuoteItemActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const canEditItems = (status: string): boolean => status === "DRAFT" || status === "PENDING";

export class DeleteQuoteItemUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(quoteId: string, itemId: string, actor: DeleteQuoteItemActorContext): Promise<QuoteResponseDto> {
    const quote = await this.quoteRepository.findById({
      id: quoteId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });
    if (!quote) throw new Error("Quote not found.");
    if (!canEditItems(quote.status)) throw new Error("Quote items cannot be edited in current status.");

    const itemExists = quote.items.some((item) => item.id === itemId);
    if (!itemExists) throw new Error("Quote item not found.");

    const updatedQuote = await this.quoteRepository.removeItem({
      quoteId,
      itemId,
      updatedByUserId: actor.id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!updatedQuote) throw new Error("Quote item not found.");
    return new QuoteResponseDto(updatedQuote);
  }
}
