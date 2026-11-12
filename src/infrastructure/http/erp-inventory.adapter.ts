import type { ErpInventoryItem, ErpInventoryPage, ErpInventoryPort } from "../../domain/contracts/erp-inventory.port";
import type { ErpInventoryQuery } from "../../domain/dtos/request/erp-inventory-query.dto";
import { normalizeInventoryWarehouseCode } from "../../domain/dtos/request/erp-inventory-query.dto";

export class ErpInventoryGatewayError extends Error {
  constructor(message: string, public readonly status: 502 | 504 = 502) { super(message); }
}

export class ErpInventoryAdapter implements ErpInventoryPort {
  constructor(private readonly apiUrl: string, private readonly productsBasePath: string,
    private readonly timeoutMs: number, private readonly apiKey?: string) {}

  private async get(path: string): Promise<unknown> {
    if (!this.apiKey) throw new ErpInventoryGatewayError("La clave interna del ERP no está configurada.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.apiUrl.replace(/\/+$/, "")}/${this.productsBasePath.replace(/^\/+|\/+$/g, "")}/inventory${path}`, {
        signal: controller.signal, headers: { "x-internal-api-key": this.apiKey },
      });
      if (!response.ok) throw new ErpInventoryGatewayError("El ERP no pudo responder la consulta de inventario. Intenta nuevamente.");
      return await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw new ErpInventoryGatewayError("La consulta al ERP excedió el tiempo de espera. Intenta nuevamente.", 504);
      if (error instanceof ErpInventoryGatewayError) throw error;
      throw new ErpInventoryGatewayError("No se pudo consultar el inventario del ERP. Intenta nuevamente.");
    } finally { clearTimeout(timer); }
  }

  async list(query: ErpInventoryQuery, warehouseCodes?: readonly string[]): Promise<ErpInventoryPage> {
    const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
    if (warehouseCodes?.length === 0) return { items: [], page: query.page, pageSize: query.pageSize, total: 0, totalPages: 0 };
    warehouseCodes?.forEach(code => params.append("warehouseCodes", code));
    const payload = await this.get(`?${params}`) as (Partial<ErpInventoryPage> & { warehouseCodes?: unknown }) | null;
    if (!payload || !Array.isArray(payload.items) || payload.items.length > query.pageSize
      || payload.page !== query.page || payload.pageSize !== query.pageSize
      || !Number.isSafeInteger(payload.total) || payload.total! < 0
      || payload.totalPages !== Math.ceil(payload.total! / query.pageSize)) {
      throw new ErpInventoryGatewayError("El ERP devolvió una respuesta de inventario no válida.");
    }
    const scope = new Set(warehouseCodes);
    if (warehouseCodes && (!Array.isArray(payload.warehouseCodes)
      || new Set(payload.warehouseCodes).size !== scope.size
      || payload.warehouseCodes.some(code => !scope.has(code)))) {
      // Do not expose rows or totals from an ERP version that ignores the scope.
      throw new ErpInventoryGatewayError("El ERP no confirmó el filtro de almacenes. Intenta nuevamente.");
    }
    const items = payload.items.map((item: ErpInventoryItem) => {
      if (!item || typeof item !== "object" || ["id", "code", "ean", "description", "unit"].some(key => typeof item[key as keyof ErpInventoryItem] !== "string")
        || !(item.warehouseCode === null || typeof item.warehouseCode === "string")
        || !(item.stock === null || typeof item.stock === "number" && Number.isFinite(item.stock))) {
        throw new ErpInventoryGatewayError("El ERP devolvió una partida de inventario no válida.");
      }
      if (warehouseCodes && (item.warehouseCode === null || !scope.has(item.warehouseCode))) {
        throw new ErpInventoryGatewayError("El ERP devolvió una partida fuera de los almacenes visibles.");
      }
      // Allowlist output: do not pass through ERP costs or accounting fields.
      return { id: item.id, code: item.code, ean: item.ean, description: item.description,
        unit: item.unit, warehouseCode: item.warehouseCode, stock: item.stock };
    });
    return { items, page: query.page, pageSize: query.pageSize, total: payload.total!, totalPages: payload.totalPages! };
  }

  async warehouses(): Promise<string[]> {
    const payload = await this.get("/warehouses");
    if (!Array.isArray(payload)) {
      throw new ErpInventoryGatewayError("El ERP devolvió una lista de almacenes no válida.");
    }
    try {
      return [...new Set(payload.map(normalizeInventoryWarehouseCode))].sort();
    } catch {
      throw new ErpInventoryGatewayError("El ERP devolvió una lista de almacenes no válida.");
    }
  }
}
