import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UserEntity } from "../entities/user.entity";

export interface FindUsersDatasourceParams {
  page: number;
  pageSize: number;
  search?: string;
  branchId?: string;
}

export interface FindUsersDatasourceResult {
  items: UserEntity[];
  total: number;
}

export interface CreateUserDatasourceParams {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone: string | null;
  erpUserCode: string | null;
  branchId: string;
}

export abstract class UserDatasource {
  abstract findPaginated(params: FindUsersDatasourceParams): Promise<FindUsersDatasourceResult>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract existsByUsername(username: string): Promise<boolean>;
  abstract existsByErpUserCode(erpUserCode: string): Promise<boolean>;
  abstract create(params: CreateUserDatasourceParams): Promise<UserEntity>;
}
