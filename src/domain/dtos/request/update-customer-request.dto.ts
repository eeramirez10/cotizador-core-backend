import {
  CustomerProfileStatus,
  CustomerSource,
} from "../../../infrastructure/database/generated/enums";

interface UpdateCustomerRequestDtoProps {
  source?: CustomerSource;
  externalId?: string | null;
  externalSystem?: string | null;
  code?: string | null;
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string;
  taxId?: string | null;
  taxRegime?: string | null;
  billingStreet?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  profileStatus?: CustomerProfileStatus;
  notes?: string | null;
}

export class UpdateCustomerRequestDto {
  public readonly source?: CustomerSource;
  public readonly externalId?: string | null;
  public readonly externalSystem?: string | null;
  public readonly code?: string | null;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly displayName?: string | null;
  public readonly legalName?: string | null;
  public readonly email?: string | null;
  public readonly phone?: string | null;
  public readonly whatsapp?: string;
  public readonly taxId?: string | null;
  public readonly taxRegime?: string | null;
  public readonly billingStreet?: string | null;
  public readonly billingCity?: string | null;
  public readonly billingState?: string | null;
  public readonly billingPostalCode?: string | null;
  public readonly billingCountry?: string | null;
  public readonly profileStatus?: CustomerProfileStatus;
  public readonly notes?: string | null;

  constructor(props: UpdateCustomerRequestDtoProps) {
    this.source = props.source;
    this.externalId = props.externalId;
    this.externalSystem = props.externalSystem;
    this.code = props.code;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.displayName = props.displayName;
    this.legalName = props.legalName;
    this.email = props.email;
    this.phone = props.phone;
    this.whatsapp = props.whatsapp;
    this.taxId = props.taxId;
    this.taxRegime = props.taxRegime;
    this.billingStreet = props.billingStreet;
    this.billingCity = props.billingCity;
    this.billingState = props.billingState;
    this.billingPostalCode = props.billingPostalCode;
    this.billingCountry = props.billingCountry;
    this.profileStatus = props.profileStatus;
    this.notes = props.notes;
  }

  static create(input: unknown): [string?, UpdateCustomerRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    const dto = new UpdateCustomerRequestDto({
      source: UpdateCustomerRequestDto.normalizeSource(body.source),
      externalId: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.externalId),
      externalSystem: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.externalSystem),
      code: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.code),
      firstName: UpdateCustomerRequestDto.normalizeRequiredStringWhenDefined(body.firstName),
      lastName: UpdateCustomerRequestDto.normalizeRequiredStringWhenDefined(body.lastName),
      displayName: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.displayName),
      legalName: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.legalName),
      email: UpdateCustomerRequestDto.normalizeEmailWhenDefined(body.email),
      phone: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.phone),
      whatsapp: UpdateCustomerRequestDto.normalizeRequiredStringWhenDefined(body.whatsapp),
      taxId: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.taxId),
      taxRegime: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.taxRegime),
      billingStreet: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingStreet),
      billingCity: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingCity),
      billingState: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingState),
      billingPostalCode: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingPostalCode),
      billingCountry: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingCountry),
      profileStatus: UpdateCustomerRequestDto.normalizeProfileStatus(body.profileStatus),
      notes: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.notes),
    });

    if (typeof body.source !== "undefined" && !dto.source) return ["source is invalid."];
    if (typeof body.profileStatus !== "undefined" && !dto.profileStatus) {
      return ["profileStatus is invalid."];
    }
    if (typeof body.firstName !== "undefined" && !dto.firstName) return ["firstName cannot be empty."];
    if (typeof body.lastName !== "undefined" && !dto.lastName) return ["lastName cannot be empty."];
    if (typeof body.whatsapp !== "undefined" && !dto.whatsapp) return ["whatsapp cannot be empty."];

    const hasAnyField = Object.keys(body).length > 0;
    if (!hasAnyField) {
      return ["At least one field is required to update customer."];
    }

    return [, dto];
  }

  private static normalizeSource(value: unknown): CustomerSource | undefined {
    if (typeof value !== "string") return undefined;
    const parsed = value.trim().toUpperCase() as CustomerSource;
    return Object.values(CustomerSource).includes(parsed) ? parsed : undefined;
  }

  private static normalizeProfileStatus(value: unknown): CustomerProfileStatus | undefined {
    if (typeof value !== "string") return undefined;
    const parsed = value.trim().toUpperCase() as CustomerProfileStatus;
    return Object.values(CustomerProfileStatus).includes(parsed) ? parsed : undefined;
  }

  private static normalizeRequiredStringWhenDefined(value: unknown): string | undefined {
    if (typeof value === "undefined") return undefined;
    return typeof value === "string" ? value.trim() : "";
  }

  private static normalizeNullableStringWhenDefined(value: unknown): string | null | undefined {
    if (typeof value === "undefined") return undefined;
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private static normalizeEmailWhenDefined(value: unknown): string | null | undefined {
    if (typeof value === "undefined") return undefined;
    return typeof value === "string" && value.trim().length > 0 ? value.trim().toLowerCase() : null;
  }
}
