import {
  CreateUserDatasourceParams,
  FindUsersDatasourceParams,
  FindUsersDatasourceResult,
} from "../datasources/user.datasource";
import { UserEntity } from "../entities/user.entity";

export abstract class UserRepository {
  abstract findPaginated(params: FindUsersDatasourceParams): Promise<FindUsersDatasourceResult>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract existsByUsername(username: string): Promise<boolean>;
  abstract existsByErpUserCode(erpUserCode: string): Promise<boolean>;
  abstract create(params: CreateUserDatasourceParams): Promise<UserEntity>;
}
