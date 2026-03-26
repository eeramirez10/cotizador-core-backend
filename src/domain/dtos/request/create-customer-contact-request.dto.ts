interface CreateCustomerContactRequestDtoProps {
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  isPrimary: boolean;
}

export class CreateCustomerContactRequestDto {
  public readonly name: string;
  public readonly jobTitle: string | null;
  public readonly email: string | null;
  public readonly phone: string | null;
  public readonly mobile: string | null;
  public readonly isPrimary: boolean;

  constructor(props: CreateCustomerContactRequestDtoProps) {
    this.name = props.name;
    this.jobTitle = props.jobTitle;
    this.email = props.email;
    this.phone = props.phone;
    this.mobile = props.mobile;
    this.isPrimary = props.isPrimary;
  }

  static create(input: unknown): [string?, CreateCustomerContactRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return ["name is required."];

    const email = CreateCustomerContactRequestDto.normalizeEmail(body.email);
    const phone = CreateCustomerContactRequestDto.normalizeNullableString(body.phone);
    const mobile = CreateCustomerContactRequestDto.normalizeNullableString(body.mobile);

    if (!email && !phone && !mobile) {
      return ["At least one contact field is required: email, phone, or mobile."];
    }

    return [
      ,
      new CreateCustomerContactRequestDto({
        name,
        jobTitle: CreateCustomerContactRequestDto.normalizeNullableString(body.jobTitle),
        email,
        phone,
        mobile,
        isPrimary: Boolean(body.isPrimary),
      }),
    ];
  }

  private static normalizeNullableString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private static normalizeEmail(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }
}

