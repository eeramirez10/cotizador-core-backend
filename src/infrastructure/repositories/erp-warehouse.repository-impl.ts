import type { WarehouseAccessMode } from "../database/generated/enums";
import type {
  CreateErpWarehouseDatasourceParams,
  UpdateErpWarehouseDatasourceParams,
} from "../../domain/datasources/erp-warehouse.datasource";
import { ErpWarehouseDatasource } from "../../domain/datasources/erp-warehouse.datasource";
import type {
  BranchWarehouseAccessEntity,
  ErpWarehouseEntity,
  UserWarehouseAccessEntity,
} from "../../domain/entities/erp-warehouse.entity";
import { ErpWarehouseRepository } from "../../domain/repositories/erp-warehouse.repository";

export class ErpWarehouseRepositoryImpl implements ErpWarehouseRepository {
  constructor(private readonly datasource: ErpWarehouseDatasource) {}

  list(includeInactive: boolean): Promise<ErpWarehouseEntity[]> { return this.datasource.list(includeInactive); }
  findById(id: string): Promise<ErpWarehouseEntity | null> { return this.datasource.findById(id); }
  findActiveByCodes(codes: string[]): Promise<ErpWarehouseEntity[]> { return this.datasource.findActiveByCodes(codes); }
  existsByCode(code: string): Promise<boolean> { return this.datasource.existsByCode(code); }
  hasAssignments(id: string): Promise<boolean> { return this.datasource.hasAssignments(id); }
  create(params: CreateErpWarehouseDatasourceParams): Promise<ErpWarehouseEntity> { return this.datasource.create(params); }
  updateById(id: string, params: UpdateErpWarehouseDatasourceParams): Promise<ErpWarehouseEntity | null> { return this.datasource.updateById(id, params); }
  getBranchAccess(branchId: string): Promise<BranchWarehouseAccessEntity | null> { return this.datasource.getBranchAccess(branchId); }
  replaceBranchWarehouses(branchId: string, warehouseIds: string[], actorUserId: string): Promise<void> { return this.datasource.replaceBranchWarehouses(branchId, warehouseIds, actorUserId); }
  getUserAccess(userId: string): Promise<UserWarehouseAccessEntity | null> { return this.datasource.getUserAccess(userId); }
  replaceUserWarehouses(userId: string, accessMode: WarehouseAccessMode, warehouseIds: string[], actorUserId: string): Promise<void> { return this.datasource.replaceUserWarehouses(userId, accessMode, warehouseIds, actorUserId); }
}
