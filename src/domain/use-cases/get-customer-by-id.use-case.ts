import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CustomerResponseDto } from "../dtos/response/customer-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";

interface GetCustomerByIdActorContext {
  role: UserRole;
  branchId: string;
}

export class GetCustomerByIdUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(id: string, actor: GetCustomerByIdActorContext): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById({
      id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!customer) throw new Error("Customer not found.");

    return new CustomerResponseDto(customer);
  }
}
