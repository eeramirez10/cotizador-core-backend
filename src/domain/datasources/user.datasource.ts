import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UserEntity } from "../entities/user.entity";

export interface FindUsersDatasourceParams {
  page: number;
  pageSize: number;
  search?: string;
  branchId?: string;
  isActive?: boolean;
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

export interface UserAccessScope {
  role: UserRole;
  branchId: string;
}

export interface FindUserByIdDatasourceParams {
  id: string;
  scope: UserAccessScope;
}

export interface UpdateUserDatasourceParams {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  phone: string | null;
  erpUserCode: string | null;
  branchId: string;
  passwordHash?: string;
}

export interface UpdateUserByIdDatasourceParams {
  id: string;
  scope: UserAccessScope;
  data: UpdateUserDatasourceParams;
}

export interface SoftDeactivateUserByIdDatasourceParams {
  id: string;
  scope: UserAccessScope;
}

export abstract class UserDatasource {
  abstract findPaginated(params: FindUsersDatasourceParams): Promise<FindUsersDatasourceResult>;
  abstract findById(params: FindUserByIdDatasourceParams): Promise<UserEntity | null>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract existsByUsername(username: string): Promise<boolean>;
  abstract existsByErpUserCode(erpUserCode: string): Promise<boolean>;
  abstract create(params: CreateUserDatasourceParams): Promise<UserEntity>;
  abstract updateById(params: UpdateUserByIdDatasourceParams): Promise<UserEntity | null>;
  abstract softDeactivateById(params: SoftDeactivateUserByIdDatasourceParams): Promise<boolean>;
}
