import type { UserRole } from "../../infrastructure/database/generated/enums";
import type { CustomerRepository } from "../repositories/customer.repository";

interface Actor {
  id: string;
  role: UserRole;
  branchId: string;
}

export class ReactivateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(customerId: string, actor: Actor): Promise<void> {
    const updated = await this.customerRepository.setActiveStatus({
      id: customerId,
      isActive: true,
      updatedByUserId: actor.id,
      scope: { role: actor.role, branchId: actor.branchId },
    });
    if (!updated) throw new Error("Customer not found or already active.");
  }
}
