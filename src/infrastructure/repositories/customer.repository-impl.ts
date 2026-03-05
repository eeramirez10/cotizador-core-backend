import {
  CreateCustomerDatasourceParams,
  FindCustomerByIdDatasourceParams,
  FindCustomersDatasourceParams,
  FindCustomersDatasourceResult,
  SoftDeleteCustomerByIdDatasourceParams,
  UpdateCustomerByIdDatasourceParams,
  CustomerDatasource,
} from "../../domain/datasources/customer.datasource";
import { CustomerEntity } from "../../domain/entities/customer.entity";
import { CustomerRepository } from "../../domain/repositories/customer.repository";

export class CustomerRepositoryImpl implements CustomerRepository {
  constructor(private readonly datasource: CustomerDatasource) {}

  findPaginated(params: FindCustomersDatasourceParams): Promise<FindCustomersDatasourceResult> {
    return this.datasource.findPaginated(params);
  }

  findById(params: FindCustomerByIdDatasourceParams): Promise<CustomerEntity | null> {
    return this.datasource.findById(params);
  }

  create(params: CreateCustomerDatasourceParams): Promise<CustomerEntity> {
    return this.datasource.create(params);
  }

  updateById(params: UpdateCustomerByIdDatasourceParams): Promise<CustomerEntity | null> {
    return this.datasource.updateById(params);
  }

  softDeleteById(params: SoftDeleteCustomerByIdDatasourceParams): Promise<boolean> {
    return this.datasource.softDeleteById(params);
  }
}
