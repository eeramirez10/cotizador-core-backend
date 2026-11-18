import { ErpProductLookupPort, type ErpProductReference } from "../../domain/contracts/erp-product-lookup.port";
import { RequisitionErpLinkError } from "../../domain/use-cases/requisition-erp-link-rule";

export class ErpProductLookupAdapter extends ErpProductLookupPort {
  constructor(
    private readonly apiUrl: string,
    private readonly productsBasePath: string,
    private readonly timeoutMs: number,
    private readonly apiKey?: string,
  ) { super(); }

  async findByCodeAndAccount(code: string, primaryAccount: string): Promise<ErpProductReference | null> {
    const base = this.apiUrl.replace(/\/+$/, "");
    const path = this.productsBasePath.replace(/^\/+|\/+$/g, "");
    try {
      if (!this.apiKey) throw new Error("Missing ERP API key");
      const response = await fetch(`${base}/${path}/identity/${encodeURIComponent(code)}?primaryAccount=${encodeURIComponent(primaryAccount)}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { "x-internal-api-key": this.apiKey },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Unexpected ERP response");
      const payload = await response.json() as Partial<ErpProductReference>;
      if (!payload || typeof payload.code !== "string" || payload.code.trim().toUpperCase() !== code
        || typeof payload.ean !== "string" || payload.ean.length > 120
        || typeof payload.description !== "string" || payload.description.length > 500
        || typeof payload.unit !== "string" || !payload.unit.trim() || payload.unit.length > 30) {
        throw new Error("Invalid ERP identity");
      }
      return { code, ean: payload.ean.trim(), description: payload.description.trim(), unit: payload.unit.trim() };
    } catch {
      throw new RequisitionErpLinkError("No se pudo verificar el producto en Proscai. Intenta nuevamente.", 502);
    }
  }
}
