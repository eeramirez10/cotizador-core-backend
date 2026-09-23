import { ErpOrderLookupPort, type ErpOrderReference } from "../../domain/contracts/erp-order-lookup.port";

export class ErpOrderLookupAdapter extends ErpOrderLookupPort {
  constructor(private readonly apiUrl: string, private readonly timeoutMs: number, private readonly apiKey?: string) { super(); }

  async findByNumber(number: string): Promise<ErpOrderReference | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.apiUrl.replace(/\/+$/, "")}/api/erp/orders/${encodeURIComponent(number)}`, {
        signal: controller.signal,
        headers: this.apiKey ? { "x-internal-api-key": this.apiKey } : {},
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`ERP_ORDER_LOOKUP_FAILED:${response.status}`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("ERP_ORDER_LOOKUP_INVALID_RESPONSE");
      }
      const row = payload as Record<string, unknown>;
      if (typeof row.orderNumber !== "string" || row.orderNumber.trim().toUpperCase() !== number) {
        throw new Error("ERP_ORDER_LOOKUP_INVALID_RESPONSE");
      }
      return {
        orderNumber: row.orderNumber.trim().toUpperCase(),
        customerCode: typeof row.customerCode === "string" ? row.customerCode.trim().toUpperCase() : null,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("ERP_ORDER_LOOKUP_")) throw error;
      throw new Error("ERP_ORDER_LOOKUP_UNAVAILABLE", { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }
}
