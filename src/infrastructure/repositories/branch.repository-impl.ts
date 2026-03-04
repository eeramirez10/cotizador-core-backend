import { BranchDatasource } from "../../domain/datasources/branch.datasource";
import { BranchEntity } from "../../domain/entities/branch.entity";
import { BranchRepository } from "../../domain/repositories/branch.repository";

export class BranchRepositoryImpl implements BranchRepository {
  constructor(private readonly datasource: BranchDatasource) {}

  findAllActive(): Promise<BranchEntity[]> {
    return this.datasource.findAllActive();
  }

  findActiveByCode(code: string): Promise<BranchEntity | null> {
    return this.datasource.findActiveByCode(code);
  }
}
