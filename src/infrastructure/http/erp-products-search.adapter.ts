import {
  ErpProductsSearchPort,
  type ErpWarehouseProduct,
} from "../../domain/contracts/erp-products-search.port";

interface SearchResponsePayload {
  items?: unknown;
}

export class ErpProductsSearchAdapter extends ErpProductsSearchPort {
  constructor(
    private readonly apiUrl: string,
    private readonly productsBasePath: string,
    private readonly timeoutMs: number,
    private readonly apiKey?: string,
  ) { super(); }

  async search(term: string, warehouseCodes: string[]): Promise<ErpWarehouseProduct[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const baseUrl = this.apiUrl.replace(/\/+$/, "");
    const basePath = this.productsBasePath.replace(/^\/+|\/+$/g, "");

    try {
      const response = await fetch(`${baseUrl}/${basePath}/search/warehouses`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { "x-internal-api-key": this.apiKey } : {}),
        },
        body: JSON.stringify({ query: term, warehouseCodes }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`ERP product search failed (${response.status}): ${body.slice(0, 300)}`);
      }

      const payload = await response.json() as SearchResponsePayload;
      if (!Array.isArray(payload.items)) throw new Error("ERP product search returned an invalid response.");
      return payload.items.flatMap((item) => {
        const mapped = this.mapProduct(item);
        return mapped ? [mapped] : [];
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("ERP product search timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapProduct(input: unknown): ErpWarehouseProduct | null {
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    const row = input as Record<string, unknown>;
    const text = (value: unknown): string => typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
    const number = (value: unknown): number => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const code = text(row.code);
    const ean = text(row.ean);
    const description = text(row.description);
    const warehouseId = text(row.warehouseId);
    if (!code || !ean || !description || !warehouseId) return null;
    const saleCurrency = text(row.saleCurrency ?? row.currency).toUpperCase() === "MXN" ? "MXN" : "USD";
    const averageCostMxn = number(row.averageCostMxn ?? row.averageCost);
    const lastCostMxn = number(row.lastCostMxn ?? row.lastCost);

    return {
      id: text(row.id),
      code,
      ean,
      description,
      stock: number(row.stock),
      unit: text(row.unit),
      currency: saleCurrency,
      saleCurrency,
      costCurrency: "MXN",
      averageCost: averageCostMxn,
      lastCost: lastCostMxn,
      averageCostMxn,
      lastCostMxn,
      warehouseId,
      warehouseName: text(row.warehouseName) || `ALMACEN ${warehouseId}`,
    };
  }
}
