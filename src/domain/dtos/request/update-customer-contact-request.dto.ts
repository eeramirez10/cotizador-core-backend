interface UpdateCustomerContactRequestDtoProps {
  name?: string;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  isPrimary?: boolean;
}

export class UpdateCustomerContactRequestDto {
  public readonly name?: string;
  public readonly jobTitle?: string | null;
  public readonly email?: string | null;
  public readonly phone?: string | null;
  public readonly mobile?: string | null;
  public readonly isPrimary?: boolean;

  constructor(props: UpdateCustomerContactRequestDtoProps) {
    this.name = props.name;
    this.jobTitle = props.jobTitle;
    this.email = props.email;
    this.phone = props.phone;
    this.mobile = props.mobile;
    this.isPrimary = props.isPrimary;
  }

  static create(input: unknown): [string?, UpdateCustomerContactRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const dto = new UpdateCustomerContactRequestDto({
      name: UpdateCustomerContactRequestDto.normalizeRequiredStringWhenDefined(body.name),
      jobTitle: UpdateCustomerContactRequestDto.normalizeNullableStringWhenDefined(body.jobTitle),
      email: UpdateCustomerContactRequestDto.normalizeEmailWhenDefined(body.email),
      phone: UpdateCustomerContactRequestDto.normalizeNullableStringWhenDefined(body.phone),
      mobile: UpdateCustomerContactRequestDto.normalizeNullableStringWhenDefined(body.mobile),
      isPrimary: typeof body.isPrimary === "boolean" ? body.isPrimary : undefined,
    });

    if (typeof body.name !== "undefined" && !dto.name) return ["name cannot be empty."];

    const hasAnyField = Object.keys(body).length > 0;
    if (!hasAnyField) return ["At least one field is required to update contact."];

    return [, dto];
  }

  private static normalizeRequiredStringWhenDefined(value: unknown): string | undefined {
    if (typeof value === "undefined") return undefined;
    if (typeof value !== "string") return "";
    return value.trim();
  }

  private static normalizeNullableStringWhenDefined(value: unknown): string | null | undefined {
    if (typeof value === "undefined") return undefined;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private static normalizeEmailWhenDefined(value: unknown): string | null | undefined {
    if (typeof value === "undefined") return undefined;
    if (typeof value !== "string") return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }
}

