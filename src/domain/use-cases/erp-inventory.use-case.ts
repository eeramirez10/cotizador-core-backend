import type { ErpInventoryPort, ErpInventoryVisibilityRepository } from "../contracts/erp-inventory.port";
import type { ErpInventoryQuery } from "../dtos/request/erp-inventory-query.dto";
import type { ErpWarehouseRepository } from "../repositories/erp-warehouse.repository";

export class ErpInventoryVisibilityError extends Error {}

export class ErpInventoryUseCase {
  constructor(
    private readonly inventory: ErpInventoryPort,
    private readonly catalog: Pick<ErpWarehouseRepository, "list">,
    private readonly visibility: ErpInventoryVisibilityRepository,
  ) {}

  private async names() {
    const warehouses = await this.catalog.list(true);
    return new Map(warehouses.map(warehouse => [warehouse.code, warehouse.name]));
  }

  async list(query: ErpInventoryQuery) {
    const warehouseCodes = await this.visibility.read();
    if (warehouseCodes !== null && (!warehouseCodes.length || (query.warehouseCode && !warehouseCodes.includes(query.warehouseCode)))) {
      return { items: [], page: query.page, pageSize: query.pageSize, total: 0, totalPages: 0, fetchedAt: new Date().toISOString() };
    }
    const [page, names] = await Promise.all([this.inventory.list(query, warehouseCodes ?? undefined), this.names()]);
    return { ...page, items: page.items.map(item => ({ ...item,
      warehouseName: item.warehouseCode === null ? "Sin registro de almacén" : names.get(item.warehouseCode) || `Almacén ${item.warehouseCode}`,
    })), fetchedAt: new Date().toISOString() };
  }

  async warehouses() {
    const warehouseCodes = await this.visibility.read();
    if (warehouseCodes?.length === 0) return [];
    const warehouses = await this.allWarehouses();
    return warehouseCodes === null ? warehouses : warehouses.filter(({ code }) => warehouseCodes.includes(code));
  }

  private async allWarehouses() {
    const [codes, names] = await Promise.all([this.inventory.warehouses(), this.names()]);
    return codes.map(code => ({ code, name: names.get(code) || `Almacén ${code}` }));
  }

  async settings() {
    const [warehouseCodes, warehouses] = await Promise.all([this.visibility.read(), this.allWarehouses()]);
    return { warehouseCodes, warehouses };
  }

  async updateSettings(warehouseCodes: string[] | null, actorUserId: string) {
    const warehouses = await this.allWarehouses();
    const available = new Set(warehouses.map(({ code }) => code));
    if (warehouseCodes?.some(code => !available.has(code))) {
      throw new ErpInventoryVisibilityError("Hay almacenes seleccionados que ya no están disponibles en Proscai.");
    }
    await this.visibility.save(warehouseCodes, actorUserId);
    return { warehouseCodes, warehouses };
  }
}
