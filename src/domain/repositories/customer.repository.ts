import {
  CreateCustomerDatasourceParams,
  FindCustomerByIdDatasourceParams,
  FindCustomersDatasourceParams,
  FindCustomersDatasourceResult,
  SoftDeleteCustomerByIdDatasourceParams,
  UpdateCustomerByIdDatasourceParams,
} from "../datasources/customer.datasource";
import { CustomerEntity } from "../entities/customer.entity";

export abstract class CustomerRepository {
  abstract findPaginated(params: FindCustomersDatasourceParams): Promise<FindCustomersDatasourceResult>;
  abstract findById(params: FindCustomerByIdDatasourceParams): Promise<CustomerEntity | null>;
  abstract create(params: CreateCustomerDatasourceParams): Promise<CustomerEntity>;
  abstract updateById(params: UpdateCustomerByIdDatasourceParams): Promise<CustomerEntity | null>;
  abstract softDeleteById(params: SoftDeleteCustomerByIdDatasourceParams): Promise<boolean>;
}
