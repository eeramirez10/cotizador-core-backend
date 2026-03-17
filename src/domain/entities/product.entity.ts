import type { Currency, ProductSource } from "../../infrastructure/database/generated/enums";

export interface ProductBranchSummary {
  id: string;
  code: string;
  name: string;
}

export interface ProductEntity {
  id: string;
  source: ProductSource;
  externalId: string | null;
  externalSystem: string | null;
  code: string | null;
  ean: string | null;
  description: string;
  unit: string;
  currency: Currency;
  averageCost: number | null;
  lastCost: number | null;
  stock: number | null;
  branchId: string | null;
  isActive: boolean;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch: ProductBranchSummary | null;
}
