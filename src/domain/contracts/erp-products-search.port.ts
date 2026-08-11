export interface ErpWarehouseProduct {
  id: string;
  code: string;
  ean: string;
  description: string;
  stock: number;
  unit: string;
  /** Legacy alias for saleCurrency. */
  currency: "MXN" | "USD";
  saleCurrency: "MXN" | "USD";
  costCurrency: "MXN";
  averageCost: number;
  lastCost: number;
  averageCostMxn: number;
  lastCostMxn: number;
  warehouseId: string;
  warehouseName: string;
}

export abstract class ErpProductsSearchPort {
  abstract search(term: string, warehouseCodes: string[]): Promise<ErpWarehouseProduct[]>;
}
