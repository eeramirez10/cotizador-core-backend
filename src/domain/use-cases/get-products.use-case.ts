import type { UserRole } from "../../infrastructure/database/generated/enums";
import { GetProductsQueryRequestDto } from "../dtos/request/get-products-query-request.dto";
import { PaginatedProductsResponseDto } from "../dtos/response/paginated-products-response.dto";
import { ProductResponseDto } from "../dtos/response/product-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { ProductRepository } from "../repositories/product.repository";

interface GetProductsActorContext {
  role: UserRole;
  branchId: string;
}

export class GetProductsUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly branchRepository: BranchRepository
  ) {}

  async execute(dto: GetProductsQueryRequestDto, actor: GetProductsActorContext): Promise<PaginatedProductsResponseDto> {
    let branchIdFilter: string | undefined = actor.role === "ADMIN" ? undefined : actor.branchId;

    if (dto.branchCode) {
      if (actor.role !== "ADMIN") {
        throw new Error("branchCode is only allowed for ADMIN.");
      }

      const branch = await this.branchRepository.findActiveByCode(dto.branchCode);
      if (!branch) throw new Error("Branch not found.");
      branchIdFilter = branch.id;
    }

    const result = await this.productRepository.findPaginated({
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
      source: dto.source,
      branchId: branchIdFilter,
      includeInactive: dto.includeInactive,
      isActive: dto.isActive,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    return new PaginatedProductsResponseDto({
      items: result.items.map((item) => new ProductResponseDto(item)),
      total: result.total,
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }
}
