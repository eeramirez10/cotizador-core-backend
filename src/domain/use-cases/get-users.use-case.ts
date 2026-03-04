import type { UserRole } from "../../infrastructure/database/generated/enums";
import { GetUsersQueryRequestDto } from "../dtos/request/get-users-query-request.dto";
import { PaginatedUsersResponseDto } from "../dtos/response/paginated-users-response.dto";
import { UserResponseDto } from "../dtos/response/user-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { UserRepository } from "../repositories/user.repository";

interface GetUsersActorContext {
  role: UserRole;
  branchId: string;
}

export class GetUsersUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly branchRepository: BranchRepository
  ) {}

  async execute(dto: GetUsersQueryRequestDto, actor: GetUsersActorContext): Promise<PaginatedUsersResponseDto> {
    let branchIdFilter: string | undefined;

    if (actor.role === "MANAGER") {
      branchIdFilter = actor.branchId;
    } else if (dto.branchCode) {
      const branch = await this.branchRepository.findActiveByCode(dto.branchCode);
      if (!branch) throw new Error("Branch not found.");
      branchIdFilter = branch.id;
    }

    const result = await this.userRepository.findPaginated({
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
      branchId: branchIdFilter,
    });

    return new PaginatedUsersResponseDto({
      items: result.items.map((item) => new UserResponseDto(item)),
      total: result.total,
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }
}
