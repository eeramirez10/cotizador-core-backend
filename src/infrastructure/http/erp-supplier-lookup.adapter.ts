import { ErpSupplierLookupPort, type ErpSupplierReference } from "../../domain/contracts/erp-supplier-lookup.port";

export class ErpSupplierLookupAdapter extends ErpSupplierLookupPort {
  constructor(
    private readonly apiUrl: string,
    private readonly productsBasePath: string,
    private readonly timeoutMs: number,
    private readonly apiKey?: string,
  ) { super(); }

  async search(term: string, limit: number): Promise<ErpSupplierReference[]> {
    const params = new URLSearchParams({ q: term.trim(), limit: String(limit) });
    return await this.request<ErpSupplierReference[]>(`/search?${params.toString()}`) ?? [];
  }

  async findByCode(code: string): Promise<ErpSupplierReference | null> {
    return this.request<ErpSupplierReference>(`/${encodeURIComponent(code.trim().toUpperCase())}`, true);
  }

  private async request<T>(path: string, allowNotFound = false): Promise<T | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(
        `${this.apiUrl.replace(/\/$/, "")}/${this.productsBasePath.replace(/^\/+|\/+$/g, "")}${path}`,
        {
          signal: controller.signal,
          headers: this.apiKey ? { "x-internal-api-key": this.apiKey } : {},
        },
      );
      if (allowNotFound && response.status === 404) return null;
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`ERP supplier service failed (${response.status}): ${body.slice(0, 300)}`);
      }
      return await response.json() as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
