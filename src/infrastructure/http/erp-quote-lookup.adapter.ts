import { ErpQuoteLookupPort, type ErpQuoteReference } from "../../domain/contracts/erp-quote-lookup.port";

export class ErpQuoteLookupAdapter extends ErpQuoteLookupPort {
  constructor(private readonly apiUrl: string, private readonly timeoutMs: number, private readonly apiKey?: string) { super(); }

  async findByNumber(number: string): Promise<ErpQuoteReference | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.apiUrl.replace(/\/+$/, "")}/api/erp/quotes/${encodeURIComponent(number)}`, {
        signal: controller.signal,
        headers: this.apiKey ? { "x-internal-api-key": this.apiKey } : {},
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`ERP_QUOTE_LOOKUP_FAILED:${response.status}`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("ERP_QUOTE_LOOKUP_INVALID_RESPONSE");
      }
      const row = payload as Record<string, unknown>;
      if (typeof row.quoteNumber !== "string" || row.quoteNumber.trim().toUpperCase() !== number) {
        throw new Error("ERP_QUOTE_LOOKUP_INVALID_RESPONSE");
      }
      return {
        quoteNumber: row.quoteNumber.trim().toUpperCase(),
        customerCode: typeof row.customerCode === "string" ? row.customerCode.trim().toUpperCase() : null,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("ERP_QUOTE_LOOKUP_")) throw error;
      throw new Error("ERP_QUOTE_LOOKUP_UNAVAILABLE", { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }
}
