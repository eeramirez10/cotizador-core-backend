import { GenerateOrderResult } from "../datasources/order-generation.datasource";
import { QuoteEntity } from "../entities/quote.entity";

export abstract class OrderGenerationRepository {
  abstract generateOrderFromQuote(quote: QuoteEntity): Promise<GenerateOrderResult>;
}
