import type { UserRole } from "../../infrastructure/database/generated/enums";
import { DeleteQuoteRequestDto } from "../dtos/request/delete-quote-request.dto";
import { QuoteRepository } from "../repositories/quote.repository";

interface Actor { id: string; role: UserRole }

export class DeleteQuoteUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(quoteId: string, dto: DeleteQuoteRequestDto, actor: Actor): Promise<void> {
    if (actor.role !== "ADMIN") throw new Error("Only ADMIN can permanently delete quotes.");
    const deleted = await this.quoteRepository.deletePermanently({
      id: quoteId,
      actorUserId: actor.id,
      confirmation: dto.confirmation,
      reason: dto.reason,
    });
    if (!deleted) throw new Error("Quote not found.");
  }
}
