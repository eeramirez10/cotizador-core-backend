import { ProductEntity } from "../../domain/entities/product.entity";

interface DecimalLike {
  toString(): string;
}

const toNumber = (value: number | DecimalLike | null): number | null => {
  if (value === null) return null;
  if (typeof value === "number") return value;
  return Number(value.toString());
};

interface ProductRow {
  id: string;
  source: ProductEntity["source"];
  externalId: string | null;
  externalSystem: string | null;
  code: string | null;
  ean: string | null;
  description: string;
  unit: string;
  currency: ProductEntity["currency"];
  averageCost: number | DecimalLike | null;
  lastCost: number | DecimalLike | null;
  stock: number | DecimalLike | null;
  branchId: string | null;
  isActive: boolean;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export class ProductMapper {
  static toEntity(row: ProductRow): ProductEntity {
    return {
      id: row.id,
      source: row.source,
      externalId: row.externalId,
      externalSystem: row.externalSystem,
      code: row.code,
      ean: row.ean,
      description: row.description,
      unit: row.unit,
      currency: row.currency,
      averageCost: toNumber(row.averageCost),
      lastCost: toNumber(row.lastCost),
      stock: toNumber(row.stock),
      branchId: row.branchId,
      isActive: row.isActive,
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      branch: row.branch
        ? {
            id: row.branch.id,
            code: row.branch.code,
            name: row.branch.name,
          }
        : null,
    };
  }
}
