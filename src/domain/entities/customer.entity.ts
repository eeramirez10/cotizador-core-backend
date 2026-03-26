import type {
  CustomerProfileStatus,
  CustomerSource,
} from "../../infrastructure/database/generated/enums";

interface CustomerUserInfo {
  id: string;
  firstName: string;
  lastName: string;
  branchId: string;
  branchCode: string;
  branchName: string;
}

export interface CustomerContactEntity {
  id: string;
  customerId: string;
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerEntity {
  id: string;
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
  isActive: boolean;
  notes: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdByUser: CustomerUserInfo | null;
  updatedByUser: CustomerUserInfo | null;
}
