import { GenerateOrderResult, GeneratedOrderFileResult } from "../datasources/order-generation.datasource";
import { QuoteEntity } from "../entities/quote.entity";

export abstract class OrderGenerationRepository {
  abstract generateOrderFromQuote(quote: QuoteEntity): Promise<GenerateOrderResult>;
  abstract getOrderFileByFileName(fileName: string): Promise<GeneratedOrderFileResult | null>;
}
