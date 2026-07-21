import { BranchEntity } from "../entities/branch.entity";

export interface CreateBranchDatasourceParams {
  code: string;
  name: string;
  contact: BranchContactData;
}

export interface UpdateBranchDatasourceParams {
  code: string;
  name: string;
  contact: BranchContactData;
}

export interface BranchContactData {
  street: string | null;
  exteriorNumber: string | null;
  interiorNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  municipality: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
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
