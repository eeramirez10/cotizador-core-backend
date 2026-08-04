import type { UserRole, WarehouseAccessMode } from "../../infrastructure/database/generated/enums";

export interface ErpWarehouseEntity {
  id: string;
  code: string;
  name: string;
  companyCode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchWarehouseAccessEntity {
  branch: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  warehouses: ErpWarehouseEntity[];
}

export interface UserWarehouseAccessEntity {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
  };
  branch: {
    id: string;
    code: string;
    name: string;
  };
  accessMode: WarehouseAccessMode;
  branchWarehouses: ErpWarehouseEntity[];
  userWarehouses: ErpWarehouseEntity[];
}

export interface EffectiveWarehouseAccessEntity extends UserWarehouseAccessEntity {
  effectiveWarehouses: ErpWarehouseEntity[];
}
