import { BranchEntity } from "../../domain/entities/branch.entity";

interface BranchRow {
  id: string;
  code: string;
  name: string;
  address: string | null;
  street: string | null;
  exteriorNumber: string | null;
  interiorNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  municipality: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  isActive: boolean;
}

export class BranchMapper {
  static toEntity(row: BranchRow): BranchEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address,
      street: row.street,
      exteriorNumber: row.exteriorNumber,
      interiorNumber: row.interiorNumber,
      neighborhood: row.neighborhood,
      city: row.city,
      municipality: row.municipality,
      state: row.state,
      postalCode: row.postalCode,
      country: row.country,
      email: row.email,
      phone: row.phone,
      secondaryPhone: row.secondaryPhone,
      isActive: row.isActive,
    };
  }
}
