import { QuoteCatalogOptionEntity } from "../../entities/quote-catalog-option.entity";

export class QuoteCatalogOptionResponseDto {
  constructor(private readonly option: QuoteCatalogOptionEntity) {}

  toJSON() {
    return {
      id: this.option.id,
      type: this.option.type,
      code: this.option.code,
      label: this.option.label,
      value: this.option.value,
      numericValue: this.option.numericValue,
      requiresComment: this.option.requiresComment,
      sortOrder: this.option.sortOrder,
      isActive: this.option.isActive,
      branchId: this.option.branchId,
      scope: this.option.branchId ? "BRANCH" : "GLOBAL",
    };
  }
}
