import { QuoteListSummaryEntity } from "../../entities/quote.entity";

export class QuoteListSummaryResponseDto {
  constructor(private readonly quote: QuoteListSummaryEntity) {}

  toJSON() {
    return {
      id: this.quote.id,
      quoteNumber: this.quote.quoteNumber,
      erpQuoteNumber: this.quote.erpQuoteNumber,
      status: this.quote.status,
      captureMethod: this.quote.captureMethod,
      originalQuoteDate: this.quote.originalQuoteDate?.toISOString().split("T")[0] ?? null,
      currency: this.quote.currency,
      taxRate: this.quote.taxRate,
      revisionNumber: this.quote.revisionNumber,
      providedByNameSnapshot: this.quote.providedByNameSnapshot,
      createdAt: this.quote.createdAt.toISOString(),
      updatedAt: this.quote.updatedAt.toISOString(),
      branch: this.quote.branch,
      customer: this.quote.customer,
      createdByUser: this.quote.createdByUser,
    };
  }
}
