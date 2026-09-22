import {
  CustomerTaxDocumentExtractorPort,
  type CustomerTaxDocumentFile,
  type ExtractedCustomerTaxDocument,
} from "../../domain/contracts/customer-tax-document-extractor.port";

export class AiPlatformCustomerTaxDocumentExtractorAdapter extends CustomerTaxDocumentExtractorPort {
  constructor(private readonly baseUrl: string, private readonly apiKey: string, private readonly timeoutMs: number) { super(); }

  async extract(file: CustomerTaxDocumentFile): Promise<ExtractedCustomerTaxDocument> {
    const form = new FormData();
    const content = Uint8Array.from(file.content);
    const arrayBuffer = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
    form.set("file", new Blob([arrayBuffer], { type: file.mimeType }), file.originalName);
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/api/v1/assistance/customer-tax-document/extract`, {
      method: "POST",
      headers: { "x-internal-api-key": this.apiKey },
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "No se pudo procesar la constancia fiscal.");
    return payload as unknown as ExtractedCustomerTaxDocument;
  }
}
