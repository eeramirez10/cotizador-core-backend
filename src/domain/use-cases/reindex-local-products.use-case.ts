import { UserRole } from "../../infrastructure/database/generated/enums";
import { LocalProductSemanticPort } from "../contracts/local-product-semantic.port";
import { ProductRepository } from "../repositories/product.repository";

export class ReindexLocalProductsUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly semanticPort: LocalProductSemanticPort,
  ) {}

  async execute(actorRole: UserRole): Promise<number> {
    if (actorRole !== "ADMIN") throw new Error("Only ADMIN can reindex local products.");
    const products = await this.productRepository.findAllActiveLocalTemps();
    await this.semanticPort.upsertMany(products);
    return products.length;
  }
}
