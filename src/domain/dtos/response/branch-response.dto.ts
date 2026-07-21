import { BranchEntity } from "../../entities/branch.entity";

export class BranchResponseDto {
  constructor(private readonly branch: BranchEntity) {}

  toJSON() {
    return {
      id: this.branch.id,
      code: this.branch.code,
      name: this.branch.name,
      address: this.branch.address,
      street: this.branch.street,
      exteriorNumber: this.branch.exteriorNumber,
      interiorNumber: this.branch.interiorNumber,
      neighborhood: this.branch.neighborhood,
      city: this.branch.city,
      municipality: this.branch.municipality,
      state: this.branch.state,
      postalCode: this.branch.postalCode,
      country: this.branch.country,
      email: this.branch.email,
      phone: this.branch.phone,
      secondaryPhone: this.branch.secondaryPhone,
      isActive: this.branch.isActive,
    };
  }
}
