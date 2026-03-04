import { AuthUserResponseDto } from "./auth-user-response.dto";


export class LoginResponseDto {
  constructor(
    private readonly accessToken: string,
    private readonly user: AuthUserResponseDto
  ) { }

  toJSON() {
    return {
      accessToken: this.accessToken,
      user: this.user.toJSON()
    }
  }
}
