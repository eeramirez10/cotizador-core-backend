import { QuoteEntity } from "../entities/quote.entity";

export interface GenerateOrderResult {
  orderReference: string;
  fileName: string;
  generatedAt: Date;
}

export interface GeneratedOrderFileResult {
  fileName: string;
  contentType: string;
  content: Buffer;
}

export abstract class OrderGenerationDatasource {
  abstract generateOrderFromQuote(quote: QuoteEntity): Promise<GenerateOrderResult>;
  abstract getOrderFileByFileName(fileName: string): Promise<GeneratedOrderFileResult | null>;
}
