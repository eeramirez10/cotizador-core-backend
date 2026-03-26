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
} from "../datasources/customer.datasource";
import { CustomerContactEntity, CustomerEntity } from "../entities/customer.entity";

export abstract class CustomerRepository {
  abstract findPaginated(params: FindCustomersDatasourceParams): Promise<FindCustomersDatasourceResult>;
  abstract findById(params: FindCustomerByIdDatasourceParams): Promise<CustomerEntity | null>;
  abstract create(params: CreateCustomerDatasourceParams): Promise<CustomerEntity>;
  abstract updateById(params: UpdateCustomerByIdDatasourceParams): Promise<CustomerEntity | null>;
  abstract softDeleteById(params: SoftDeleteCustomerByIdDatasourceParams): Promise<boolean>;
  abstract findContacts(params: FindCustomerContactsDatasourceParams): Promise<CustomerContactEntity[]>;
  abstract createContact(params: CreateCustomerContactDatasourceParams): Promise<CustomerContactEntity | null>;
  abstract updateContact(params: UpdateCustomerContactDatasourceParams): Promise<CustomerContactEntity | null>;
  abstract deleteContact(params: DeleteCustomerContactDatasourceParams): Promise<boolean>;
}
