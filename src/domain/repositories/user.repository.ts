import {
  CreateUserDatasourceParams,
  FindUserByIdDatasourceParams,
  FindUsersDatasourceParams,
  FindUsersDatasourceResult,
  SoftDeactivateUserByIdDatasourceParams,
  UpdateUserByIdDatasourceParams,
} from "../datasources/user.datasource";
import { UserEntity } from "../entities/user.entity";

export abstract class UserRepository {
  abstract findPaginated(params: FindUsersDatasourceParams): Promise<FindUsersDatasourceResult>;
  abstract findById(params: FindUserByIdDatasourceParams): Promise<UserEntity | null>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract existsByUsername(username: string): Promise<boolean>;
  abstract existsByErpUserCode(erpUserCode: string): Promise<boolean>;
  abstract create(params: CreateUserDatasourceParams): Promise<UserEntity>;
  abstract updateById(params: UpdateUserByIdDatasourceParams): Promise<UserEntity | null>;
  abstract softDeactivateById(params: SoftDeactivateUserByIdDatasourceParams): Promise<boolean>;
}
