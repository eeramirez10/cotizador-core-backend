import {
  AddQuoteItemDatasourceParams,
  ChangeQuoteStatusDatasourceParams,
  CreateQuoteDatasourceParams,
  FindQuoteByIdDatasourceParams,
  FindQuotesDatasourceParams,
  FindQuotesDatasourceResult,
  RemoveQuoteItemDatasourceParams,
  UpdateQuoteByIdDatasourceParams,
  UpdateQuoteItemDatasourceParams,
} from "../datasources/quote.datasource";
import { QuoteEntity } from "../entities/quote.entity";

export abstract class QuoteRepository {
  abstract findPaginated(params: FindQuotesDatasourceParams): Promise<FindQuotesDatasourceResult>;
  abstract findById(params: FindQuoteByIdDatasourceParams): Promise<QuoteEntity | null>;
  abstract createDraft(params: CreateQuoteDatasourceParams): Promise<QuoteEntity>;
  abstract updateById(params: UpdateQuoteByIdDatasourceParams): Promise<QuoteEntity | null>;
  abstract addItem(params: AddQuoteItemDatasourceParams): Promise<QuoteEntity | null>;
  abstract updateItem(params: UpdateQuoteItemDatasourceParams): Promise<QuoteEntity | null>;
  abstract removeItem(params: RemoveQuoteItemDatasourceParams): Promise<QuoteEntity | null>;
  abstract changeStatus(params: ChangeQuoteStatusDatasourceParams): Promise<QuoteEntity | null>;
}
