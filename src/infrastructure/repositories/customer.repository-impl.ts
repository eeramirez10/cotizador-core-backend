import {
  CreateCustomerDatasourceParams,
  CreateCustomerContactDatasourceParams,
  DeleteCustomerContactDatasourceParams,
  FindCustomerByIdDatasourceParams,
  FindCustomerContactsDatasourceParams,
  FindCustomersDatasourceParams,
  FindCustomersDatasourceResult,
  SoftDeleteCustomerByIdDatasourceParams,
  UpdateCustomerContactDatasourceParams,
  UpdateCustomerByIdDatasourceParams,
  CustomerDatasource,
} from "../../domain/datasources/customer.datasource";
import { CustomerContactEntity, CustomerEntity } from "../../domain/entities/customer.entity";
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

  findContacts(params: FindCustomerContactsDatasourceParams): Promise<CustomerContactEntity[]> {
    return this.datasource.findContacts(params);
  }

  createContact(params: CreateCustomerContactDatasourceParams): Promise<CustomerContactEntity | null> {
    return this.datasource.createContact(params);
  }

  updateContact(params: UpdateCustomerContactDatasourceParams): Promise<CustomerContactEntity | null> {
    return this.datasource.updateContact(params);
  }

  deleteContact(params: DeleteCustomerContactDatasourceParams): Promise<boolean> {
    return this.datasource.deleteContact(params);
  }
}
