import { BranchEntity } from "../../entities/branch.entity";

export class BranchResponseDto {
  constructor(private readonly branch: BranchEntity) {}

  toJSON() {
    return {
      id: this.branch.id,
      code: this.branch.code,
      name: this.branch.name,
      address: this.branch.address,
      isActive: this.branch.isActive,
    };
  }
}
