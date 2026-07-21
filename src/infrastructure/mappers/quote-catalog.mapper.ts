import { QuoteCatalogOption } from "../database/generated/client";
import { QuoteCatalogOptionEntity } from "../../domain/entities/quote-catalog-option.entity";

export class QuoteCatalogMapper {
  static toEntity(row: QuoteCatalogOption): QuoteCatalogOptionEntity {
    return {
      id: row.id,
      type: row.type,
      code: row.code,
      label: row.label,
      value: row.value,
      numericValue: row.numericValue,
      requiresComment: row.requiresComment,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      branchId: row.branchId,
    };
  }
}
