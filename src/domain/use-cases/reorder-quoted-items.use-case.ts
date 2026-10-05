import type { UserRole } from "../../infrastructure/database/generated/enums";
import { ReorderQuotedItemsRequestDto } from "../dtos/request/reorder-quoted-items-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

export class ReorderQuotedItemsUseCase {
  constructor(private readonly quotes: QuoteRepository) {}

  async execute(quoteId: string, dto: ReorderQuotedItemsRequestDto, actor: { id: string; role: UserRole; branchId: string }): Promise<QuoteResponseDto> {
    const quote = await this.quotes.reorderQuotedItems({
      id: quoteId,
      itemIds: dto.itemIds,
      actorUserId: actor.id,
      scope: { role: actor.role, userId: actor.id, branchId: actor.branchId },
    });
    if (!quote) throw new Error("Quote not found.");
    return new QuoteResponseDto(quote);
  }
}
