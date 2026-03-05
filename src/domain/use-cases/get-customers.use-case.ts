import type { UserRole } from "../../infrastructure/database/generated/enums";
import { GetCustomersQueryRequestDto } from "../dtos/request/get-customers-query-request.dto";
import { CustomerResponseDto } from "../dtos/response/customer-response.dto";
import { PaginatedCustomersResponseDto } from "../dtos/response/paginated-customers-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";

interface GetCustomersActorContext {
  role: UserRole;
  branchId: string;
}

export class GetCustomersUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(
    dto: GetCustomersQueryRequestDto,
    actor: GetCustomersActorContext
  ): Promise<PaginatedCustomersResponseDto> {
    const result = await this.customerRepository.findPaginated({
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
      source: dto.source,
      profileStatus: dto.profileStatus,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    return new PaginatedCustomersResponseDto({
      items: result.items.map((item) => new CustomerResponseDto(item)),
      total: result.total,
      page: dto.page,
      pageSize: dto.pageSize,
    });
  }
}
