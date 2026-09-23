import { ErpCustomerLookupPort, type ErpCustomerReference } from "../../domain/contracts/erp-customer-lookup.port";

export class ErpCustomerLookupAdapter extends ErpCustomerLookupPort {
  constructor(private readonly apiUrl: string, private readonly timeoutMs: number, private readonly apiKey?: string) { super(); }

  async findByCode(code: string): Promise<ErpCustomerReference | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const params = new URLSearchParams({ q: code, limit: "50" });
      const response = await fetch(`${this.apiUrl.replace(/\/$/, "")}/api/erp/customers/search?${params}`, {
        signal: controller.signal,
        headers: this.apiKey ? { "x-internal-api-key": this.apiKey } : {},
      });
      if (!response.ok) throw new Error(`ERP_CUSTOMER_LOOKUP_FAILED:${response.status}`);
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error("ERP_CUSTOMER_LOOKUP_INVALID_RESPONSE");
      const match = payload.find((row) => row && typeof row === "object" &&
        String((row as Record<string, unknown>).code || "").trim().toUpperCase() === code);
      if (!match) return null;
      const row = match as Record<string, unknown>;
      if (!row.externalId) throw new Error("ERP_CUSTOMER_LOOKUP_INVALID_RESPONSE");
      return { code: String(row.code).trim().toUpperCase(), taxId: String(row.taxId || "").trim().toUpperCase(), externalId: String(row.externalId || "").trim() };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("ERP_CUSTOMER_LOOKUP_")) throw error;
      throw new Error("ERP_CUSTOMER_LOOKUP_UNAVAILABLE", { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }
}
