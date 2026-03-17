import {
  CreateLocalTempProductDatasourceParams,
  FindLocalTempByDescriptionAndUnitDatasourceParams,
  FindProductsDatasourceParams,
  FindProductsDatasourceResult,
  SoftDeleteLocalTempProductByIdDatasourceParams,
  UpdateLocalTempProductDatasourceParams,
} from "../datasources/product.datasource";
import { ProductEntity } from "../entities/product.entity";

export abstract class ProductRepository {
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
