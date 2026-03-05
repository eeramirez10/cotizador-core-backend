import type { QuoteStatus, UserRole } from "../../infrastructure/database/generated/enums";
import { ChangeQuoteStatusRequestDto } from "../dtos/request/change-quote-status-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

interface ChangeQuoteStatusActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const allowedTransitions: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["QUOTED", "CANCELLED"],
  QUOTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

const isTransitionAllowed = (from: QuoteStatus, to: QuoteStatus): boolean => {
  return allowedTransitions[from].includes(to);
};

export class ChangeQuoteStatusUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(
    quoteId: string,
    dto: ChangeQuoteStatusRequestDto,
    actor: ChangeQuoteStatusActorContext
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteRepository.findById({
      id: quoteId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });
    if (!quote) throw new Error("Quote not found.");

    if (quote.status === dto.status) throw new Error("Quote is already in the requested status.");
    if (!isTransitionAllowed(quote.status, dto.status)) {
      throw new Error(`Invalid status transition from ${quote.status} to ${dto.status}.`);
    }
    if (dto.status === "QUOTED" && quote.items.length === 0) {
      throw new Error("Quote must contain at least one item before moving to QUOTED.");
    }

    const updatedQuote = await this.quoteRepository.changeStatus({
      id: quoteId,
      status: dto.status,
      note: dto.note,
      actorUserId: actor.id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!updatedQuote) throw new Error("Quote not found.");
    return new QuoteResponseDto(updatedQuote);
  }
}
