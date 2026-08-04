import type { WarehouseAccessMode } from "../../infrastructure/database/generated/enums";
import type {
  CreateErpWarehouseDatasourceParams,
  UpdateErpWarehouseDatasourceParams,
} from "../datasources/erp-warehouse.datasource";
import type {
  BranchWarehouseAccessEntity,
  ErpWarehouseEntity,
  UserWarehouseAccessEntity,
} from "../entities/erp-warehouse.entity";

export abstract class ErpWarehouseRepository {
  abstract list(includeInactive: boolean): Promise<ErpWarehouseEntity[]>;
  abstract findById(id: string): Promise<ErpWarehouseEntity | null>;
  abstract findActiveByCodes(codes: string[]): Promise<ErpWarehouseEntity[]>;
  abstract existsByCode(code: string): Promise<boolean>;
  abstract hasAssignments(id: string): Promise<boolean>;
  abstract create(params: CreateErpWarehouseDatasourceParams): Promise<ErpWarehouseEntity>;
  abstract updateById(id: string, params: UpdateErpWarehouseDatasourceParams): Promise<ErpWarehouseEntity | null>;
  abstract getBranchAccess(branchId: string): Promise<BranchWarehouseAccessEntity | null>;
  abstract replaceBranchWarehouses(branchId: string, warehouseIds: string[], actorUserId: string): Promise<void>;
  abstract getUserAccess(userId: string): Promise<UserWarehouseAccessEntity | null>;
  abstract replaceUserWarehouses(userId: string, accessMode: WarehouseAccessMode, warehouseIds: string[], actorUserId: string): Promise<void>;
}
