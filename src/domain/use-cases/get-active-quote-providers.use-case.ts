import { GetUsersQueryRequestDto } from "../dtos/request/get-users-query-request.dto";
import { PaginatedUsersResponseDto } from "../dtos/response/paginated-users-response.dto";
import { UserResponseDto } from "../dtos/response/user-response.dto";
import { UserRepository } from "../repositories/user.repository";

export class GetActiveQuoteProvidersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: GetUsersQueryRequestDto): Promise<PaginatedUsersResponseDto> {
    const result = await this.userRepository.findPaginated({
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
      isActive: true,
    });

    return new PaginatedUsersResponseDto({
      items: result.items.map((item) => new UserResponseDto(item)),
      total: result.total,
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }
}
