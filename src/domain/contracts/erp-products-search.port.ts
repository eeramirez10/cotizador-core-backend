export interface ErpWarehouseProduct {
  id: string;
  code: string;
  ean: string;
  description: string;
  stock: number;
  unit: string;
  currency: "MXN" | "USD";
  averageCost: number;
  lastCost: number;
  warehouseId: string;
  warehouseName: string;
}

export abstract class ErpProductsSearchPort {
  abstract search(term: string, warehouseCodes: string[]): Promise<ErpWarehouseProduct[]>;
}
