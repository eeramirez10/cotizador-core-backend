import type { UserRole } from "../../infrastructure/database/generated/enums";
import { ProductRepository } from "../repositories/product.repository";

interface DeleteLocalTempProductActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class DeleteLocalTempProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string, actor: DeleteLocalTempProductActorContext): Promise<void> {
    const deleted = await this.productRepository.softDeleteLocalTempById({
      id,
      updatedByUserId: actor.id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!deleted) throw new Error("Local temp product not found.");
  }
}
