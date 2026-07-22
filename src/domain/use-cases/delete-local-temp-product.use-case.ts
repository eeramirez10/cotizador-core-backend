import type { UserRole } from "../../infrastructure/database/generated/enums";
import { LocalProductSemanticPort } from "../contracts/local-product-semantic.port";
import { ProductRepository } from "../repositories/product.repository";

interface DeleteLocalTempProductActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class DeleteLocalTempProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly semanticPort: LocalProductSemanticPort,
  ) {}

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
    await this.semanticPort.remove(id);
  }
}
