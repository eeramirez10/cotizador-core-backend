import { AuthUserEntity } from "../../entities/auth-user.entity";

interface AuthUserResponseDtoProps {

}


export class AuthUserResponseDto {

  constructor(private readonly user: AuthUserEntity) {

  }

  toJSON() {
    return {
      id: this.user.id,
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      fullName: `${this.user.firstName} ${this.user.lastName}`.trim(),
      email: this.user.email,
      role: this.user.role,
      branchId: this.user.branchId,
      branchName: this.user.branchName,
      erpUserCode: this.user.erpUserCode,
      isActive: this.user.isActive,
    };
  }

}