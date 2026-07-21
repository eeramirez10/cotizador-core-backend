import { QuoteCatalogDatasource, CreateQuoteCatalogOptionDatasourceParams, QuoteCatalogActorScope, UpdateQuoteCatalogOptionDatasourceParams } from "../../domain/datasources/quote-catalog.datasource";
import { QuoteCatalogOptionEntity } from "../../domain/entities/quote-catalog-option.entity";
import { QuoteCatalogRepository } from "../../domain/repositories/quote-catalog.repository";
import { QuoteCatalogType } from "../database/generated/enums";

export class QuoteCatalogRepositoryImpl implements QuoteCatalogRepository {
  constructor(private readonly datasource: QuoteCatalogDatasource) {}
  listAvailable(branchId: string, type?: QuoteCatalogType): Promise<QuoteCatalogOptionEntity[]> { return this.datasource.listAvailable(branchId, type); }
  listManaged(actor: QuoteCatalogActorScope): Promise<QuoteCatalogOptionEntity[]> { return this.datasource.listManaged(actor); }
  findById(id: string): Promise<QuoteCatalogOptionEntity | null> { return this.datasource.findById(id); }
  existsInScope(type: QuoteCatalogType, code: string, branchId: string | null, excludeId?: string): Promise<boolean> { return this.datasource.existsInScope(type, code, branchId, excludeId); }
  create(params: CreateQuoteCatalogOptionDatasourceParams): Promise<QuoteCatalogOptionEntity> { return this.datasource.create(params); }
  updateById(id: string, params: UpdateQuoteCatalogOptionDatasourceParams): Promise<QuoteCatalogOptionEntity | null> { return this.datasource.updateById(id, params); }
  findActiveByCode(branchId: string, type: QuoteCatalogType, code: string): Promise<QuoteCatalogOptionEntity | null> { return this.datasource.findActiveByCode(branchId, type, code); }
  findActiveByValue(branchId: string, type: QuoteCatalogType, value: string): Promise<QuoteCatalogOptionEntity | null> { return this.datasource.findActiveByValue(branchId, type, value); }
  findActiveByNumericValue(branchId: string, type: QuoteCatalogType, numericValue: number): Promise<QuoteCatalogOptionEntity | null> { return this.datasource.findActiveByNumericValue(branchId, type, numericValue); }
}
