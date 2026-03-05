import { CustomerEntity } from "../../entities/customer.entity";

export class CustomerResponseDto {
  constructor(private readonly customer: CustomerEntity) {}

  toJSON() {
    return {
      id: this.customer.id,
      source: this.customer.source,
      externalId: this.customer.externalId,
      externalSystem: this.customer.externalSystem,
      code: this.customer.code,
      firstName: this.customer.firstName,
      lastName: this.customer.lastName,
      displayName: this.customer.displayName,
      legalName: this.customer.legalName,
      email: this.customer.email,
      phone: this.customer.phone,
      whatsapp: this.customer.whatsapp,
      taxId: this.customer.taxId,
      taxRegime: this.customer.taxRegime,
      billingStreet: this.customer.billingStreet,
      billingCity: this.customer.billingCity,
      billingState: this.customer.billingState,
      billingPostalCode: this.customer.billingPostalCode,
      billingCountry: this.customer.billingCountry,
      profileStatus: this.customer.profileStatus,
      isActive: this.customer.isActive,
      notes: this.customer.notes,
      createdByUserId: this.customer.createdByUserId,
      updatedByUserId: this.customer.updatedByUserId,
      createdByUser: this.customer.createdByUser,
      updatedByUser: this.customer.updatedByUser,
      createdAt: this.customer.createdAt.toISOString(),
      updatedAt: this.customer.updatedAt.toISOString(),
    };
  }
}
