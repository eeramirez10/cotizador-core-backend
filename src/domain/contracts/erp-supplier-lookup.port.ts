export interface ErpSupplierContactReference {
  name: string;
  position: string;
  phone: string;
  extension: string;
  email: string;
  mobile: string;
  notes: string;
}

export interface ErpSupplierReference {
  code: string;
  name: string;
  taxId: string;
  state: string;
  creditTerms: string;
  currency: "MXN" | "USD";
  contacts: ErpSupplierContactReference[];
}

export abstract class ErpSupplierLookupPort {
  abstract search(term: string, limit: number): Promise<ErpSupplierReference[]>;
  abstract findByCode(code: string): Promise<ErpSupplierReference | null>;
}
