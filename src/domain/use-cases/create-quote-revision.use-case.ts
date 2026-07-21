import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateQuoteRevisionRequestDto } from "../dtos/request/create-quote-revision-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteCatalogRepository } from "../repositories/quote-catalog.repository";
import { QuoteRepository } from "../repositories/quote.repository";
import { QuoteCatalogType } from "../../infrastructure/database/generated/enums";

interface CreateQuoteRevisionActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class CreateQuoteRevisionUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly quoteCatalogRepository: QuoteCatalogRepository
  ) {}

  async execute(
    quoteId: string,
    dto: CreateQuoteRevisionRequestDto,
    actor: CreateQuoteRevisionActorContext
  ): Promise<QuoteResponseDto> {
    if (actor.role !== "SELLER") throw new Error("Only SELLER can create a quote revision.");

    const source = await this.quoteRepository.findById({
      id: quoteId,
      scope: { role: actor.role, userId: actor.id, branchId: actor.branchId },
    });
    if (!source) throw new Error("Quote not found.");
    if (source.archivedAt) throw new Error("Archived quotes are read-only.");
    if (!["QUOTED", "APPROVED", "REJECTED"].includes(source.status)) {
      throw new Error("Only an authorized quote can be revised.");
    }
    if (source.orderStatus === "GENERATED") {
      throw new Error("A quote with a generated order cannot be revised.");
    }
    const reason = await this.quoteCatalogRepository.findActiveByCode(actor.branchId, "REVISION_REASON" as QuoteCatalogType, dto.reason);
    if (!reason) throw new Error("Selected revision reason is not available for this branch.");
    if (reason.requiresComment && !dto.comment) throw new Error("A comment is required for the selected revision reason.");

    const revision = await this.quoteRepository.createRevision({
      sourceQuoteId: source.id,
      reason: dto.reason,
      comment: dto.comment,
      actorUserId: actor.id,
      scope: { role: actor.role, userId: actor.id, branchId: actor.branchId },
    });

    return new QuoteResponseDto(revision);
  }
}
