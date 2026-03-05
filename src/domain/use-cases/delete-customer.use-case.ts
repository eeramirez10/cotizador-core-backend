import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CustomerRepository } from "../repositories/customer.repository";

interface DeleteCustomerActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class DeleteCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(id: string, actor: DeleteCustomerActorContext): Promise<void> {
    const deleted = await this.customerRepository.softDeleteById({
      id,
      updatedByUserId: actor.id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!deleted) throw new Error("Customer not found.");
  }
}
