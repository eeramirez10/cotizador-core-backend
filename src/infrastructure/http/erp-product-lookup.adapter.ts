import { ErpProductLookupPort, type ErpProductReference } from "../../domain/contracts/erp-product-lookup.port";

interface ErpProductPayload {
  code?: unknown;
  ean?: unknown;
  description?: unknown;
  unit?: unknown;
  currency?: unknown;
  stock?: unknown;
}

export class ErpProductLookupAdapter extends ErpProductLookupPort {
  constructor(
    private readonly apiUrl: string,
    private readonly productsBasePath: string,
    private readonly timeoutMs: number,
  ) {
    super();
  }

  async findByCodeInMexico(code: string): Promise<ErpProductReference | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const baseUrl = this.apiUrl.replace(/\/$/, "");
    const basePath = `/${this.productsBasePath.replace(/^\/+|\/+$/g, "")}`;
    try {
      const response = await fetch(
        `${baseUrl}${basePath}/by-code/${encodeURIComponent(code.trim().toUpperCase())}/mexico`,
        { signal: controller.signal },
      );
      if (response.status === 404) return null;
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`ERP product service failed (${response.status}): ${body.slice(0, 300)}`);
      }

      const payload = await response.json() as ErpProductPayload;
      const normalizedCode = typeof payload.code === "string" ? payload.code.trim().toUpperCase() : "";
      const ean = typeof payload.ean === "string" ? payload.ean.trim() : "";
      const description = typeof payload.description === "string" ? payload.description.trim() : "";
      const unit = typeof payload.unit === "string" ? payload.unit.trim().toUpperCase() : "";
      const currency = payload.currency === "MXN" ? "MXN" : payload.currency === "USD" ? "USD" : null;
      const stock = Number(payload.stock);
      if (!normalizedCode || !ean || !description || !unit || !currency || !Number.isFinite(stock)) {
        throw new Error("ERP returned an incomplete product payload.");
      }

      return { code: normalizedCode, ean, description, unit, currency, stock };
    } finally {
      clearTimeout(timeout);
    }
  }
}
