import { QuoteEntity } from "../../entities/quote.entity";
import { QuoteItemResponseDto } from "./quote-item-response.dto";

export class QuoteResponseDto {
  constructor(private readonly quote: QuoteEntity) {}

  toJSON() {
    return {
      id: this.quote.id,
      quoteNumber: this.quote.quoteNumber,
      status: this.quote.status,
      origin: this.quote.origin,
      currency: this.quote.currency,
      exchangeRate: this.quote.exchangeRate,
      exchangeRateDate: this.quote.exchangeRateDate.toISOString().split("T")[0],
      taxRate: this.quote.taxRate,
      subtotal: this.quote.subtotal,
      tax: this.quote.tax,
      total: this.quote.total,
      branchId: this.quote.branchId,
      customerId: this.quote.customerId,
      createdByUserId: this.quote.createdByUserId,
      updatedByUserId: this.quote.updatedByUserId,
      notes: this.quote.notes,
      createdAt: this.quote.createdAt.toISOString(),
      updatedAt: this.quote.updatedAt.toISOString(),
      branch: this.quote.branch,
      customer: this.quote.customer,
      createdByUser: this.quote.createdByUser,
      updatedByUser: this.quote.updatedByUser,
      items: this.quote.items.map((item) => new QuoteItemResponseDto(item).toJSON()),
      events: this.quote.events.map((event) => ({
        id: event.id,
        quoteId: event.quoteId,
        status: event.status,
        note: event.note,
        actorUserId: event.actorUserId,
        createdAt: event.createdAt.toISOString(),
        actorUser: event.actorUser,
      })),
    };
  }
}
