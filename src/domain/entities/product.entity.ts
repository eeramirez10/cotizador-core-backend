import type {
  Currency,
  ProductCostSource,
  ProductCostStatus,
  ProductProcurementStatus,
  ProductSource,
} from "../../infrastructure/database/generated/enums";

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
  commercialDescription: string | null;
  family: string | null;
  subfamily: string | null;
  brand: string | null;
  technicalAttributes: Record<string, string>;
  unit: string;
  currency: Currency;
  averageCost: number | null;
  lastCost: number | null;
  costStatus: ProductCostStatus;
  costSource: ProductCostSource | null;
  stock: number | null;
  branchId: string | null;
  isActive: boolean;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  procurementStatus: ProductProcurementStatus;
  procurementNotes: string | null;
  selectedProcurementOfferId: string | null;
  procurementUpdatedAt: Date | null;
  procurementUpdatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch: ProductBranchSummary | null;
}
