import { ProductEntity } from "../../entities/product.entity";

export class ProductResponseDto {
  constructor(private readonly product: ProductEntity) {}

  toJSON() {
    return {
      id: this.product.id,
      source: this.product.source,
      externalId: this.product.externalId,
      externalSystem: this.product.externalSystem,
      code: this.product.code,
      ean: this.product.ean,
      description: this.product.description,
      unit: this.product.unit,
      currency: this.product.currency,
      averageCost: this.product.averageCost,
      lastCost: this.product.lastCost,
      stock: this.product.stock,
      branchId: this.product.branchId,
      isActive: this.product.isActive,
      createdByUserId: this.product.createdByUserId,
      updatedByUserId: this.product.updatedByUserId,
      createdAt: this.product.createdAt.toISOString(),
      updatedAt: this.product.updatedAt.toISOString(),
      branch: this.product.branch,
    };
  }
}
