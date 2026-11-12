import type { ErpInventoryQuery } from "../dtos/request/erp-inventory-query.dto";

export interface ErpInventoryItem {
  id: string;
  code: string;
  ean: string;
  description: string;
  unit: string;
  warehouseCode: string | null;
  stock: number | null;
}
export interface ErpInventoryPage {
  items: ErpInventoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface ErpInventoryPort {
  list(query: ErpInventoryQuery, warehouseCodes?: readonly string[]): Promise<ErpInventoryPage>;
  warehouses(): Promise<string[]>;
}
export interface ErpInventoryVisibilityRepository {
  read(): Promise<string[] | null>;
  save(warehouseCodes: string[] | null, actorUserId: string): Promise<void>;
}
