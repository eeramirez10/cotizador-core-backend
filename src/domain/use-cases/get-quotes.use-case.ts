import type { UserRole } from "../../infrastructure/database/generated/enums";
import { GetQuotesQueryRequestDto } from "../dtos/request/get-quotes-query-request.dto";
import { PaginatedQuotesResponseDto } from "../dtos/response/paginated-quotes-response.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { QuoteRepository } from "../repositories/quote.repository";

interface GetQuotesActorContext {
  role: UserRole;
  branchId: string;
}

export class GetQuotesUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly branchRepository: BranchRepository
  ) {}

  async execute(dto: GetQuotesQueryRequestDto, actor: GetQuotesActorContext): Promise<PaginatedQuotesResponseDto> {
    let branchIdFilter: string | undefined;

    if (actor.role !== "ADMIN") {
      branchIdFilter = actor.branchId;
    } else if (dto.branchCode) {
      const branch = await this.branchRepository.findActiveByCode(dto.branchCode);
      if (!branch) throw new Error("Branch not found.");
      branchIdFilter = branch.id;
    }

    const result = await this.quoteRepository.findPaginated({
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
      status: dto.status,
      branchId: branchIdFilter,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    return new PaginatedQuotesResponseDto({
      items: result.items.map((item) => new QuoteResponseDto(item)),
      total: result.total,
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }
}
