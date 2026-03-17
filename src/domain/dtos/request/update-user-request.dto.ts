import { UserRole } from "../../../infrastructure/database/generated/enums";

interface UpdateUserRequestDtoProps {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  branchCode: string;
  phone: string | null;
  erpUserCode: string | null;
  password?: string;
}

export class UpdateUserRequestDto {
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly username: string;
  public readonly email: string;
  public readonly role: UserRole;
  public readonly branchCode: string;
  public readonly phone: string | null;
  public readonly erpUserCode: string | null;
  public readonly password?: string;

  constructor(props: UpdateUserRequestDtoProps) {
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.username = props.username;
    this.email = props.email;
    this.role = props.role;
    this.branchCode = props.branchCode;
    this.phone = props.phone;
    this.erpUserCode = props.erpUserCode;
    this.password = props.password;
  }

  static create(input: unknown): [string?, UpdateUserRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const roleRaw = typeof body.role === "string" ? body.role.trim().toUpperCase() : "";
    const branchCode =
      typeof body.branchCode === "string" ? body.branchCode.trim().toUpperCase() : "";
    const phone = typeof body.phone === "string" && body.phone.trim().length > 0 ? body.phone.trim() : null;
    const erpUserCode =
      typeof body.erpUserCode === "string" && body.erpUserCode.trim().length > 0
        ? body.erpUserCode.trim()
        : null;
    const password =
      typeof body.password === "string" && body.password.trim().length > 0
        ? body.password.trim()
        : undefined;

    if (!firstName) return ["firstName is required."];
    if (!lastName) return ["lastName is required."];
    if (!username) return ["username is required."];
    if (!email) return ["email is required."];
    if (!branchCode) return ["branchCode is required."];
    if (password && password.length < 8) return ["password must contain at least 8 characters."];
    if (!Object.values(UserRole).includes(roleRaw as UserRole)) return ["role is invalid."];

    return [
      ,
      new UpdateUserRequestDto({
        firstName,
        lastName,
        username,
        email,
        role: roleRaw as UserRole,
        branchCode,
        phone,
        erpUserCode,
        password,
      }),
    ];
  }
}
