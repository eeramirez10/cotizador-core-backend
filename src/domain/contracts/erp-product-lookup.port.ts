export interface ErpProductReference {
  code: string;
  ean: string;
  description: string;
  unit: string;
  currency: "MXN" | "USD";
  stock: number;
}

export abstract class ErpProductLookupPort {
  abstract findByCodeInMexico(code: string): Promise<ErpProductReference | null>;
}
