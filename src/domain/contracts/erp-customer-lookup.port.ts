export interface ErpCustomerReference {
  code: string;
  taxId: string;
  externalId: string;
}

export abstract class ErpCustomerLookupPort {
  abstract findByCode(code: string): Promise<ErpCustomerReference | null>;
}
