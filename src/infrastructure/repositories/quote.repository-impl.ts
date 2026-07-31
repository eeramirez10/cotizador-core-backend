import {
  AddQuoteItemDatasourceParams,
  ChangeQuoteStatusDatasourceParams,
  CreateQuoteDatasourceParams,
  CreateQuoteRevisionDatasourceParams,
  ArchiveQuoteDatasourceParams,
  RestoreQuoteDatasourceParams,
  DeleteQuoteDatasourceParams,
  FindQuoteByIdDatasourceParams,
  FindQuotesDatasourceParams,
  FindQuotesDatasourceResult,
  MarkQuoteOrderGeneratedDatasourceParams,
  QuoteDatasource,
  RecordQuoteDeliveryAttemptDatasourceParams,
  RegisterErpQuoteDatasourceParams,
  RemoveQuoteItemDatasourceParams,
  SaveQuoteDraftDatasourceParams,
  SaveQuoteDraftDatasourceResult,
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

  saveDraft(params: SaveQuoteDraftDatasourceParams): Promise<SaveQuoteDraftDatasourceResult> {
    return this.datasource.saveDraft(params);
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

  createRevision(params: CreateQuoteRevisionDatasourceParams): Promise<QuoteEntity> {
    return this.datasource.createRevision(params);
  }

  archive(params: ArchiveQuoteDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.archive(params);
  }

  restore(params: RestoreQuoteDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.restore(params);
  }

  deletePermanently(params: DeleteQuoteDatasourceParams): Promise<boolean> {
    return this.datasource.deletePermanently(params);
  }

  recordDeliveryAttempt(params: RecordQuoteDeliveryAttemptDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.recordDeliveryAttempt(params);
  }

  markOrderGenerated(params: MarkQuoteOrderGeneratedDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.markOrderGenerated(params);
  }

  registerErpQuote(params: RegisterErpQuoteDatasourceParams): Promise<QuoteEntity | null> {
    return this.datasource.registerErpQuote(params);
  }
}
