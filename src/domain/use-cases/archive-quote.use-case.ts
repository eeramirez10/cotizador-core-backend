import type { UserRole } from "../../infrastructure/database/generated/enums";
import { ArchiveQuoteRequestDto } from "../dtos/request/archive-quote-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

interface Actor { id: string; role: UserRole }

export class ArchiveQuoteUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(quoteId: string, dto: ArchiveQuoteRequestDto, actor: Actor): Promise<QuoteResponseDto> {
    if (actor.role !== "ADMIN") throw new Error("Only ADMIN can archive quotes.");
    const quote = await this.quoteRepository.archive({ id: quoteId, actorUserId: actor.id, reason: dto.reason });
    if (!quote) throw new Error("Quote not found.");
    return new QuoteResponseDto(quote);
  }
}
