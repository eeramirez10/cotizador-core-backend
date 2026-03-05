import { QuoteEntity } from "../entities/quote.entity";

export interface GenerateOrderResult {
  orderReference: string;
  generatedAt: Date;
}

export abstract class OrderGenerationDatasource {
  abstract generateOrderFromQuote(quote: QuoteEntity): Promise<GenerateOrderResult>;
}
