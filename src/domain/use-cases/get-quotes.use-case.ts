import type { UserRole } from "../../infrastructure/database/generated/enums";
import { GetQuotesQueryRequestDto } from "../dtos/request/get-quotes-query-request.dto";
import { PaginatedQuotesResponseDto } from "../dtos/response/paginated-quotes-response.dto";
import { PaginatedQuoteSummariesResponseDto } from "../dtos/response/paginated-quote-summaries-response.dto";
import { QuoteListSummaryResponseDto } from "../dtos/response/quote-list-summary-response.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { QuoteRepository } from "../repositories/quote.repository";

interface GetQuotesActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class GetQuotesUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly branchRepository: BranchRepository
  ) {}

  async execute(
    dto: GetQuotesQueryRequestDto,
    actor: GetQuotesActorContext
  ): Promise<PaginatedQuotesResponseDto | PaginatedQuoteSummariesResponseDto> {
    if (dto.archived && actor.role !== "ADMIN") {
      throw new Error("Only ADMIN can list archived quotes.");
    }
    let branchIdFilter: string | undefined;

    if (actor.role !== "ADMIN") {
      branchIdFilter = actor.branchId;
    } else if (dto.branchCode) {
      const branch = await this.branchRepository.findActiveByCode(dto.branchCode);
      if (!branch) throw new Error("Branch not found.");
      branchIdFilter = branch.id;
    }

    const params = {
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
      status: dto.status,
      branchId: branchIdFilter,
      archived: dto.archived,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
    };

    if (dto.view === "SUMMARY") {
      const result = await this.quoteRepository.findPaginatedSummaries(params);

      return new PaginatedQuoteSummariesResponseDto({
        items: result.items.map((item) => ({
          current: new QuoteListSummaryResponseDto(item.current),
          relatedVersions: item.relatedVersions.map((version) => new QuoteListSummaryResponseDto(version)),
        })),
        total: result.total,
        page: dto.page,
        pageSize: dto.pageSize,
      });
    }

    const result = await this.quoteRepository.findPaginated(params);

    return new PaginatedQuotesResponseDto({
      items: result.items.map((item) => ({
        current: new QuoteResponseDto(item.current),
        relatedVersions: item.relatedVersions.map((version) => new QuoteResponseDto(version)),
      })),
      total: result.total,
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }
}
