import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CustomerContactResponseDto } from "../dtos/response/customer-contact-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";

interface GetCustomerContactsActorContext {
  role: UserRole;
  branchId: string;
}

export class GetCustomerContactsUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(customerId: string, actor: GetCustomerContactsActorContext): Promise<CustomerContactResponseDto[]> {
    const customer = await this.customerRepository.findById({
      id: customerId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!customer) throw new Error("Customer not found.");

    const contacts = await this.customerRepository.findContacts({
      customerId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    return contacts.map((contact) => new CustomerContactResponseDto(contact));
  }
}

