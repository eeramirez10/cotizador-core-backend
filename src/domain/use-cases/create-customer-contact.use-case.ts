import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateCustomerContactRequestDto } from "../dtos/request/create-customer-contact-request.dto";
import { CustomerContactResponseDto } from "../dtos/response/customer-contact-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";

interface CreateCustomerContactActorContext {
  role: UserRole;
  branchId: string;
}

export class CreateCustomerContactUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(
    customerId: string,
    dto: CreateCustomerContactRequestDto,
    actor: CreateCustomerContactActorContext
  ): Promise<CustomerContactResponseDto> {
    const customer = await this.customerRepository.findById({
      id: customerId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!customer) throw new Error("Customer not found.");

    const contact = await this.customerRepository.createContact({
      customerId,
      data: {
        name: dto.name,
        jobTitle: dto.jobTitle,
        email: dto.email,
        phone: dto.phone,
        mobile: dto.mobile,
        isPrimary: dto.isPrimary,
      },
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!contact) throw new Error("Customer not found.");
    return new CustomerContactResponseDto(contact);
  }
}

