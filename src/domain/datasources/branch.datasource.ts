import { BranchEntity } from "../entities/branch.entity";

export interface CreateBranchDatasourceParams {
  code: string;
  name: string;
  address: string | null;
}

export interface UpdateBranchDatasourceParams {
  code: string;
  name: string;
  address: string | null;
}

export abstract class BranchDatasource {
  abstract findAllActive(): Promise<BranchEntity[]>;
  abstract findById(id: string): Promise<BranchEntity | null>;
  abstract findActiveByCode(code: string): Promise<BranchEntity | null>;
  abstract existsByCode(code: string, excludeId?: string): Promise<boolean>;
  abstract create(params: CreateBranchDatasourceParams): Promise<BranchEntity>;
  abstract updateById(id: string, data: UpdateBranchDatasourceParams): Promise<BranchEntity | null>;
  abstract softDeactivateById(id: string): Promise<boolean>;
  abstract hasActiveUsers(branchId: string): Promise<boolean>;
}
