export interface ErpOrderReference {
  orderNumber: string;
  customerCode: string | null;
}

export abstract class ErpOrderLookupPort {
  abstract findByNumber(number: string): Promise<ErpOrderReference | null>;
}
