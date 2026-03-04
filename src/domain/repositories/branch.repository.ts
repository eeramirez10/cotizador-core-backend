import { BranchEntity } from "../entities/branch.entity";

export abstract class BranchRepository {
  abstract findAllActive(): Promise<BranchEntity[]>;
  abstract findActiveByCode(code: string): Promise<BranchEntity | null>;
}
