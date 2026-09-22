export interface CustomerTaxDocumentFile {
  content: Uint8Array;
  originalName: string;
  mimeType: string;
}

export interface ExtractedCustomerTaxDocument {
  businessName: string | null;
  taxId: string | null;
  taxRegime: string | null;
  address: {
    street: string | null;
    exteriorNumber: string | null;
    interiorNumber: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
  contacts: Array<{
    name: string | null;
    email: string | null;
    landlinePhone: string | null;
    whatsappPhone: string | null;
  }>;
  confidence: number;
  evidence: string | null;
}

export abstract class CustomerTaxDocumentExtractorPort {
  abstract extract(file: CustomerTaxDocumentFile): Promise<ExtractedCustomerTaxDocument>;
}
