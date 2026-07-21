import { QuoteCatalogType } from "../../infrastructure/database/generated/enums";

export interface QuoteCatalogOptionEntity {
  id: string;
  type: QuoteCatalogType;
  code: string;
  label: string;
  value: string | null;
  numericValue: number | null;
  requiresComment: boolean;
  sortOrder: number;
  isActive: boolean;
  branchId: string | null;
}
