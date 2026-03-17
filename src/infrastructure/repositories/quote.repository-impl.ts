import {
  AddQuoteItemDatasourceParams,
  ChangeQuoteStatusDatasourceParams,
  CreateQuoteDatasourceParams,
  FindQuoteByIdDatasourceParams,
  FindQuotesDatasourceParams,
  FindQuotesDatasourceResult,
  MarkQuoteOrderGeneratedDatasourceParams,
  QuoteDatasource,
  RecordQuoteDeliveryAttemptDatasourceParams,
  RemoveQuoteItemDatasourceParams,
  UpdateQuoteByIdDatasourceParams,
  UpdateQuoteItemDatasourceParams,
} from "../../domain/datasources/quote.datasource";
import { QuoteEntity } from "../../domain/entities/quote.entity";
import { QuoteRepository } from "../../domain/repositories/quote.repository";

export class QuoteRepositoryImpl implements QuoteRepository {
  constructor(private readonly datasource: QuoteDatasource) {}

  findPaginated(params: FindQuotesDatasourceParams): Promise<FindQuotesDatasourceResult> {
    return this.datasource.findPaginated(params);
  }

  findById(params: FindQuoteByIdDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.findById(params);
  }

  createDraft(params: CreateQuoteDatasourceParams): Promise<QuoteEntity> {
    return this.datasource.createDraft(params);
  }

  updateById(params: UpdateQuoteByIdDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.updateById(params);
  }

  addItem(params: AddQuoteItemDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.addItem(params);
  }

  updateItem(params: UpdateQuoteItemDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.updateItem(params);
  }

  removeItem(params: RemoveQuoteItemDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.removeItem(params);
  }

  changeStatus(params: ChangeQuoteStatusDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.changeStatus(params);
  }

  recordDeliveryAttempt(params: RecordQuoteDeliveryAttemptDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.recordDeliveryAttempt(params);
  }

  markOrderGenerated(params: MarkQuoteOrderGeneratedDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.markOrderGenerated(params);
  }
}
