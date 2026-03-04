import { BranchEntity } from "../../domain/entities/branch.entity";

interface BranchRow {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

export class BranchMapper {
  static toEntity(row: BranchRow): BranchEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      address: row.address,
      isActive: row.isActive,
    };
  }
}
