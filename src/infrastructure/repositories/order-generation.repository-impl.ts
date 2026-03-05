import { GenerateOrderResult } from "../../domain/datasources/order-generation.datasource";
import { QuoteEntity } from "../../domain/entities/quote.entity";
import { OrderGenerationRepository } from "../../domain/repositories/order-generation.repository";
import { OrderGenerationDatasource } from "../../domain/datasources/order-generation.datasource";

export class OrderGenerationRepositoryImpl implements OrderGenerationRepository {
  constructor(private readonly datasource: OrderGenerationDatasource) {}

  generateOrderFromQuote(quote: QuoteEntity): Promise<GenerateOrderResult> {
    return this.datasource.generateOrderFromQuote(quote);
  }
}
