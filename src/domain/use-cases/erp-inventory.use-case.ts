import type { ErpInventoryPort } from "../contracts/erp-inventory.port";
import type { ErpInventoryQuery } from "../dtos/request/erp-inventory-query.dto";
import type { ErpWarehouseRepository } from "../repositories/erp-warehouse.repository";

export class ErpInventoryUseCase {
  constructor(private readonly inventory: ErpInventoryPort, private readonly catalog: Pick<ErpWarehouseRepository, "list">) {}

  private async names() {
    const warehouses = await this.catalog.list(true);
    return new Map(warehouses.map(warehouse => [warehouse.code, warehouse.name]));
  }

  async list(query: ErpInventoryQuery) {
    const [page, names] = await Promise.all([this.inventory.list(query), this.names()]);
    return { ...page, items: page.items.map(item => ({ ...item,
      warehouseName: item.warehouseCode === null ? "Sin registro de almacén" : names.get(item.warehouseCode) || `Almacén ${item.warehouseCode}`,
    })), fetchedAt: new Date().toISOString() };
  }

  async warehouses() {
    const [codes, names] = await Promise.all([this.inventory.warehouses(), this.names()]);
    return codes.map(code => ({ code, name: names.get(code) || `Almacén ${code}` }));
  }
}
