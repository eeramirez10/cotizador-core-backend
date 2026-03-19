import {
  BranchDatasource,
  CreateBranchDatasourceParams,
  UpdateBranchDatasourceParams,
} from "../../domain/datasources/branch.datasource";
import { BranchEntity } from "../../domain/entities/branch.entity";
import { BranchRepository } from "../../domain/repositories/branch.repository";

export class BranchRepositoryImpl implements BranchRepository {
  constructor(private readonly datasource: BranchDatasource) {}

  findAllActive(): Promise<BranchEntity[]> {
    return this.datasource.findAllActive();
  }

  findById(id: string): Promise<BranchEntity | null> {
    return this.datasource.findById(id);
  }

  findActiveByCode(code: string): Promise<BranchEntity | null> {
    return this.datasource.findActiveByCode(code);
  }

  existsByCode(code: string, excludeId?: string): Promise<boolean> {
    return this.datasource.existsByCode(code, excludeId);
  }

  create(params: CreateBranchDatasourceParams): Promise<BranchEntity> {
    return this.datasource.create(params);
  }

  updateById(id: string, data: UpdateBranchDatasourceParams): Promise<BranchEntity | null> {
    return this.datasource.updateById(id, data);
  }

  softDeactivateById(id: string): Promise<boolean> {
    return this.datasource.softDeactivateById(id);
  }

  hasActiveUsers(branchId: string): Promise<boolean> {
    return this.datasource.hasActiveUsers(branchId);
  }
}
