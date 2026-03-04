import { UserEntity } from "../../entities/user.entity";

export class UserResponseDto {
  constructor(private readonly user: UserEntity) {}

  toJSON() {
    return {
      id: this.user.id,
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      fullName: `${this.user.firstName} ${this.user.lastName}`.trim(),
      username: this.user.username,
      email: this.user.email,
      role: this.user.role,
      isActive: this.user.isActive,
      phone: this.user.phone,
      erpUserCode: this.user.erpUserCode,
      branch: {
        id: this.user.branch.id,
        code: this.user.branch.code,
        name: this.user.branch.name,
      },
    };
  }
}
