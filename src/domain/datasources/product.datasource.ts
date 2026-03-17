import type {
  Currency,
  ProductSource,
  UserRole,
} from "../../infrastructure/database/generated/enums";
import { ProductEntity } from "../entities/product.entity";

export interface ProductAccessScope {
  role: UserRole;
  branchId: string;
}

export interface FindProductsDatasourceParams {
  page: number;
  pageSize: number;
  search?: string;
  source?: ProductSource;
  branchId?: string;
  includeInactive?: boolean;
  isActive?: boolean;
  scope: ProductAccessScope;
}

export interface FindProductsDatasourceResult {
  items: ProductEntity[];
  total: number;
}

export interface FindLocalTempByDescriptionAndUnitDatasourceParams {
  branchId: string;
  description: string;
  unit: string;
}

export interface CreateLocalTempProductDatasourceParams {
  description: string;
  unit: string;
  currency: Currency;
  averageCost: number | null;
  lastCost: number | null;
  stock: number | null;
  ean: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  branchId: string;
}

export interface UpdateLocalTempProductDatasourceParams {
  id: string;
  scope: ProductAccessScope;
  data: {
    code?: string | null;
    ean?: string | null;
    description?: string;
    unit?: string;
    currency?: Currency;
    averageCost?: number | null;
    lastCost?: number | null;
    stock?: number | null;
    isActive?: boolean;
    updatedByUserId: string;
  };
}

export interface SoftDeleteLocalTempProductByIdDatasourceParams {
  id: string;
  updatedByUserId: string;
  scope: ProductAccessScope;
}

export abstract class ProductDatasource {
  abstract findPaginated(params: FindProductsDatasourceParams): Promise<FindProductsDatasourceResult>;
  abstract findActiveLocalTempByDescriptionAndUnit(
    params: FindLocalTempByDescriptionAndUnitDatasourceParams
  ): Promise<ProductEntity | null>;
  abstract createLocalTemp(params: CreateLocalTempProductDatasourceParams): Promise<ProductEntity>;
  abstract updateLocalTempById(params: UpdateLocalTempProductDatasourceParams): Promise<ProductEntity | null>;
  abstract softDeleteLocalTempById(
    params: SoftDeleteLocalTempProductByIdDatasourceParams
  ): Promise<boolean>;
}
