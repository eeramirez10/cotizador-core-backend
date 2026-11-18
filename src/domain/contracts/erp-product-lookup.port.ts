export interface ErpProductReference {
  code: string;
  ean: string;
  description: string;
  unit: string;
}

export abstract class ErpProductLookupPort {
  abstract findByCodeAndAccount(code: string, primaryAccount: string): Promise<ErpProductReference | null>;
}
