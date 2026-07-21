import { QuoteCatalogType, UserRole } from "../../infrastructure/database/generated/enums";
import { QuoteCatalogOptionEntity } from "../entities/quote-catalog-option.entity";

export interface QuoteCatalogActorScope {
  role: UserRole;
  branchId: string;
}

export interface CreateQuoteCatalogOptionDatasourceParams {
  type: QuoteCatalogType;
  code: string;
  label: string;
  value: string | null;
  numericValue: number | null;
  requiresComment: boolean;
  sortOrder: number;
  branchId: string | null;
}

export interface UpdateQuoteCatalogOptionDatasourceParams {
  label: string;
  value: string | null;
  numericValue: number | null;
  requiresComment: boolean;
  sortOrder: number;
  isActive: boolean;
}

export abstract class QuoteCatalogDatasource {
  abstract listAvailable(branchId: string, type?: QuoteCatalogType): Promise<QuoteCatalogOptionEntity[]>;
  abstract listManaged(actor: QuoteCatalogActorScope): Promise<QuoteCatalogOptionEntity[]>;
  abstract findById(id: string): Promise<QuoteCatalogOptionEntity | null>;
  abstract existsInScope(type: QuoteCatalogType, code: string, branchId: string | null, excludeId?: string): Promise<boolean>;
  abstract create(params: CreateQuoteCatalogOptionDatasourceParams): Promise<QuoteCatalogOptionEntity>;
  abstract updateById(id: string, params: UpdateQuoteCatalogOptionDatasourceParams): Promise<QuoteCatalogOptionEntity | null>;
  abstract findActiveByCode(branchId: string, type: QuoteCatalogType, code: string): Promise<QuoteCatalogOptionEntity | null>;
  abstract findActiveByValue(branchId: string, type: QuoteCatalogType, value: string): Promise<QuoteCatalogOptionEntity | null>;
  abstract findActiveByNumericValue(branchId: string, type: QuoteCatalogType, numericValue: number): Promise<QuoteCatalogOptionEntity | null>;
}
