import {
  ActivateUserByIdDatasourceParams,
  CreateUserDatasourceParams,
  FindUserByIdDatasourceParams,
  FindUsersDatasourceParams,
  FindUsersDatasourceResult,
  SoftDeactivateUserByIdDatasourceParams,
  UpdateUserByIdDatasourceParams,
  UserDatasource,
} from "../../domain/datasources/user.datasource";
import { UserEntity } from "../../domain/entities/user.entity";
import { UserRepository } from "../../domain/repositories/user.repository";

export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly datasource: UserDatasource) {}

  findPaginated(params: FindUsersDatasourceParams): Promise<FindUsersDatasourceResult> {
    return this.datasource.findPaginated(params);
  }

  findById(params: FindUserByIdDatasourceParams): Promise<UserEntity | null> {
    return this.datasource.findById(params);
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.datasource.existsByEmail(email);
  }

  existsByUsername(username: string): Promise<boolean> {
    return this.datasource.existsByUsername(username);
  }

  existsByErpUserCode(erpUserCode: string): Promise<boolean> {
    return this.datasource.existsByErpUserCode(erpUserCode);
  }

  existsByPhone(phone: string): Promise<boolean> {
    return this.datasource.existsByPhone(phone);
  }

  create(params: CreateUserDatasourceParams): Promise<UserEntity> {
    return this.datasource.create(params);
  }

  updateById(params: UpdateUserByIdDatasourceParams): Promise<UserEntity | null> {
    return this.datasource.updateById(params);
  }

  softDeactivateById(params: SoftDeactivateUserByIdDatasourceParams): Promise<boolean> {
    return this.datasource.softDeactivateById(params);
  }

  activateById(params: ActivateUserByIdDatasourceParams): Promise<boolean> {
    return this.datasource.activateById(params);
  }
}
