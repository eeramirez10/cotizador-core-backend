import { CustomerContactEntity } from "../../entities/customer.entity";

export class CustomerContactResponseDto {
  constructor(private readonly contact: CustomerContactEntity) {}

  toJSON() {
    return {
      id: this.contact.id,
      customerId: this.contact.customerId,
      name: this.contact.name,
      jobTitle: this.contact.jobTitle,
      email: this.contact.email,
      phone: this.contact.phone,
      mobile: this.contact.mobile,
      isPrimary: this.contact.isPrimary,
      createdAt: this.contact.createdAt.toISOString(),
      updatedAt: this.contact.updatedAt.toISOString(),
    };
  }
}

