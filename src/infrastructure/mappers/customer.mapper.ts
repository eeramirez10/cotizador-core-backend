import { CustomerEntity } from "../../domain/entities/customer.entity";
import type {
  CustomerProfileStatus,
  CustomerSource,
} from "../database/generated/enums";

interface CustomerUserRow {
  id: string;
  firstName: string;
  lastName: string;
  branchId: string;
  branch: {
    code: string;
    name: string;
  };
}

interface CustomerRow {
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
  billingExteriorNumber: string | null;
  billingInteriorNumber: string | null;
  billingNeighborhood: string | null;
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
  createdByUser: CustomerUserRow | null;
  updatedByUser: CustomerUserRow | null;
  contacts: Array<{
    id: string;
    customerId: string;
    name: string;
    jobTitle: string | null;
    label: string | null;
    email: string | null;
    phone: string | null;
    phoneExtension: string | null;
    mobile: string | null;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export class CustomerMapper {
  static toEntity(row: CustomerRow): CustomerEntity {
    return {
      id: row.id,
      source: row.source,
      externalId: row.externalId,
      externalSystem: row.externalSystem,
      code: row.code,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
      legalName: row.legalName,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      taxId: row.taxId,
      taxRegime: row.taxRegime,
      billingStreet: row.billingStreet,
      billingExteriorNumber: row.billingExteriorNumber,
      billingInteriorNumber: row.billingInteriorNumber,
      billingNeighborhood: row.billingNeighborhood,
      billingCity: row.billingCity,
      billingState: row.billingState,
      billingPostalCode: row.billingPostalCode,
      billingCountry: row.billingCountry,
      profileStatus: row.profileStatus,
      isActive: row.isActive,
      notes: row.notes,
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdByUser: row.createdByUser
        ? {
            id: row.createdByUser.id,
            firstName: row.createdByUser.firstName,
            lastName: row.createdByUser.lastName,
            branchId: row.createdByUser.branchId,
            branchCode: row.createdByUser.branch.code,
            branchName: row.createdByUser.branch.name,
          }
        : null,
      updatedByUser: row.updatedByUser
        ? {
            id: row.updatedByUser.id,
            firstName: row.updatedByUser.firstName,
            lastName: row.updatedByUser.lastName,
            branchId: row.updatedByUser.branchId,
            branchCode: row.updatedByUser.branch.code,
            branchName: row.updatedByUser.branch.name,
          }
        : null,
      contacts: row.contacts.map((contact) => ({
        id: contact.id,
        customerId: contact.customerId,
        name: contact.name,
        jobTitle: contact.jobTitle,
        label: contact.label,
        email: contact.email,
        phone: contact.phone,
        phoneExtension: contact.phoneExtension,
        mobile: contact.mobile,
        isPrimary: contact.isPrimary,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      })),
    };
  }
}
