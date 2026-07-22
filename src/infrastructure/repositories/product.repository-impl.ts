import {
  CreateLocalTempProductDatasourceParams,
  FindLocalTempByDescriptionAndUnitDatasourceParams,
  FindProductsDatasourceParams,
  FindProductsDatasourceResult,
  ProductDatasource,
  SoftDeleteLocalTempProductByIdDatasourceParams,
  UpdateLocalTempProductDatasourceParams,
} from "../../domain/datasources/product.datasource";
import { ProductEntity } from "../../domain/entities/product.entity";
import { ProductRepository } from "../../domain/repositories/product.repository";

export class ProductRepositoryImpl implements ProductRepository {
  constructor(private readonly datasource: ProductDatasource) {}

  findPaginated(params: FindProductsDatasourceParams): Promise<FindProductsDatasourceResult> {
    return this.datasource.findPaginated(params);
  }

  findActiveLocalTempByDescriptionAndUnit(
    params: FindLocalTempByDescriptionAndUnitDatasourceParams
  ): Promise<ProductEntity | null> {
    return this.datasource.findActiveLocalTempByDescriptionAndUnit(params);
  }

  findActiveLocalTempsByIds(ids: string[]): Promise<ProductEntity[]> {
    return this.datasource.findActiveLocalTempsByIds(ids);
  }

  findAllActiveLocalTemps(): Promise<ProductEntity[]> {
    return this.datasource.findAllActiveLocalTemps();
  }

  createLocalTemp(params: CreateLocalTempProductDatasourceParams): Promise<ProductEntity> {
    return this.datasource.createLocalTemp(params);
  }

  updateLocalTempById(params: UpdateLocalTempProductDatasourceParams): Promise<ProductEntity | null> {
    return this.datasource.updateLocalTempById(params);
  }

  softDeleteLocalTempById(params: SoftDeleteLocalTempProductByIdDatasourceParams): Promise<boolean> {
    return this.datasource.softDeleteLocalTempById(params);
  }
}
