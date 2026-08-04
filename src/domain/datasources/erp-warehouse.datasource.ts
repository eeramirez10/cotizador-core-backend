import type { WarehouseAccessMode } from "../../infrastructure/database/generated/enums";
import type {
  BranchWarehouseAccessEntity,
  ErpWarehouseEntity,
  UserWarehouseAccessEntity,
} from "../entities/erp-warehouse.entity";

export interface CreateErpWarehouseDatasourceParams {
  code: string;
  name: string;
  companyCode: string | null;
}

export interface UpdateErpWarehouseDatasourceParams {
  name: string;
  companyCode: string | null;
  isActive: boolean;
}

export abstract class ErpWarehouseDatasource {
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
  abstract replaceUserWarehouses(
    userId: string,
    accessMode: WarehouseAccessMode,
    warehouseIds: string[],
    actorUserId: string,
  ): Promise<void>;
}
