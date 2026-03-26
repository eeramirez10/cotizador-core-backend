import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CustomerRepository } from "../repositories/customer.repository";

interface DeleteCustomerContactActorContext {
  role: UserRole;
  branchId: string;
}

export class DeleteCustomerContactUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(customerId: string, contactId: string, actor: DeleteCustomerContactActorContext): Promise<void> {
    const customer = await this.customerRepository.findById({
      id: customerId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!customer) throw new Error("Customer not found.");

    const deleted = await this.customerRepository.deleteContact({
      customerId,
      contactId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!deleted) throw new Error("Customer contact not found.");
  }
}

