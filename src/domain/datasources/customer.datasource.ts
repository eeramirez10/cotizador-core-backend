import type {
  CustomerProfileStatus,
  CustomerSource,
  UserRole,
} from "../../infrastructure/database/generated/enums";
import { CustomerEntity } from "../entities/customer.entity";

export interface CustomerAccessScope {
  role: UserRole;
  branchId: string;
}

export interface FindCustomersDatasourceParams {
  page: number;
  pageSize: number;
  search?: string;
  source?: CustomerSource;
  profileStatus?: CustomerProfileStatus;
  scope: CustomerAccessScope;
}

export interface FindCustomersDatasourceResult {
  items: CustomerEntity[];
  total: number;
}

export interface CreateCustomerDatasourceParams {
  source: CustomerSource;
  externalId: string | null;
  externalSystem: string | null;
  code: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string;
  taxId: string | null;
  taxRegime: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  profileStatus: CustomerProfileStatus;
  notes: string | null;
  createdByUserId: string;
  updatedByUserId: string;
}

export interface UpdateCustomerDatasourceParams {
  source?: CustomerSource;
  externalId?: string | null;
  externalSystem?: string | null;
  code?: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string;
  taxId?: string | null;
  taxRegime?: string | null;
  billingStreet?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  profileStatus?: CustomerProfileStatus;
  notes?: string | null;
  updatedByUserId: string;
}

export interface FindCustomerByIdDatasourceParams {
  id: string;
  scope: CustomerAccessScope;
}

export interface UpdateCustomerByIdDatasourceParams {
  id: string;
  data: UpdateCustomerDatasourceParams;
  scope: CustomerAccessScope;
}

export interface SoftDeleteCustomerByIdDatasourceParams {
  id: string;
  updatedByUserId: string;
  scope: CustomerAccessScope;
}

export abstract class CustomerDatasource {
  abstract findPaginated(params: FindCustomersDatasourceParams): Promise<FindCustomersDatasourceResult>;
  abstract findById(params: FindCustomerByIdDatasourceParams): Promise<CustomerEntity | null>;
  abstract create(params: CreateCustomerDatasourceParams): Promise<CustomerEntity>;
  abstract updateById(params: UpdateCustomerByIdDatasourceParams): Promise<CustomerEntity | null>;
  abstract softDeleteById(params: SoftDeleteCustomerByIdDatasourceParams): Promise<boolean>;
}
