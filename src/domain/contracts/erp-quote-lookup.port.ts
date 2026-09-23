export interface ErpQuoteReference {
  quoteNumber: string;
  customerCode: string | null;
}

export abstract class ErpQuoteLookupPort {
  abstract findByNumber(number: string): Promise<ErpQuoteReference | null>;
}
