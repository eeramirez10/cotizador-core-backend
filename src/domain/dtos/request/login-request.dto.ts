

interface LoginRequestDtoProps {
  email: string
  password: string

}

export class LoginRequestDto {
  public readonly email: string
  public readonly password: string

  constructor(props: LoginRequestDtoProps) {
    this.email = props.email
    this.password = props.password
  }

  static create(input: unknown): [string?, LoginRequestDto?] {
    if (!input || typeof input !== 'object') {
      return ['Invalid request body']
    }

    const { email, password } = input as Record<string, any>


    if (!email || typeof email !== "string") return ["Email is required."];
    if (!password || typeof password !== "string") return ["Password is required."];

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) return ["Email is required."];
    if (!normalizedPassword) return ["Password is required."];
    return [, new LoginRequestDto({ email: normalizedEmail, password: normalizedPassword })]
  }
}