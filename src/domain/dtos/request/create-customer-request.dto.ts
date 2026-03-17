import {
  CustomerProfileStatus,
  CustomerSource,
} from "../../../infrastructure/database/generated/enums";

interface CreateCustomerRequestDtoProps {
  source: CustomerSource;
  externalId: string | null;
  externalSystem: string | null;
  code: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string;
  taxId: string | null;
  taxRegime: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  profileStatus: CustomerProfileStatus;
  notes: string | null;
}

export class CreateCustomerRequestDto {
  public readonly source: CustomerSource;
  public readonly externalId: string | null;
  public readonly externalSystem: string | null;
  public readonly code: string | null;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly displayName: string | null;
  public readonly legalName: string | null;
  public readonly email: string | null;
  public readonly phone: string | null;
  public readonly whatsapp: string;
  public readonly taxId: string | null;
  public readonly taxRegime: string | null;
  public readonly billingStreet: string | null;
  public readonly billingCity: string | null;
  public readonly billingState: string | null;
  public readonly billingPostalCode: string | null;
  public readonly billingCountry: string | null;
  public readonly profileStatus: CustomerProfileStatus;
  public readonly notes: string | null;

  constructor(props: CreateCustomerRequestDtoProps) {
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

  static create(input: unknown): [string?, CreateCustomerRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const sourceRaw = typeof body.source === "string" ? body.source.trim().toUpperCase() : "LOCAL";
    const source = sourceRaw as CustomerSource;

    if (!Object.values(CustomerSource).includes(source)) {
      return ["source is invalid."];
    }

    const firstName = CreateCustomerRequestDto.normalizeRequiredString(body.firstName);
    const lastName = CreateCustomerRequestDto.normalizeRequiredString(body.lastName);
    const whatsapp = CreateCustomerRequestDto.normalizeRequiredString(body.whatsapp);

    if (!firstName) return ["firstName is required."];
    if (!lastName) return ["lastName is required."];
    if (!whatsapp) return ["whatsapp is required."];

    const profileStatusRaw =
      typeof body.profileStatus === "string" ? body.profileStatus.trim().toUpperCase() : "PROSPECT";
    const profileStatus = profileStatusRaw as CustomerProfileStatus;

    if (!Object.values(CustomerProfileStatus).includes(profileStatus)) {
      return ["profileStatus is invalid."];
    }

    const externalId = CreateCustomerRequestDto.normalizeNullableString(body.externalId);
    const externalSystemRaw = CreateCustomerRequestDto.normalizeNullableString(body.externalSystem);
    const externalSystem = source === "ERP" ? (externalSystemRaw || "ERP") : externalSystemRaw;

    if (source === "ERP" && !externalId) {
      return ["externalId is required when source is ERP."];
    }

    return [
      ,
      new CreateCustomerRequestDto({
        source,
        externalId,
        externalSystem,
        code: CreateCustomerRequestDto.normalizeNullableString(body.code),
        firstName,
        lastName,
        displayName: CreateCustomerRequestDto.normalizeNullableString(body.displayName),
        legalName: CreateCustomerRequestDto.normalizeNullableString(body.legalName),
        email: CreateCustomerRequestDto.normalizeEmail(body.email),
        phone: CreateCustomerRequestDto.normalizeNullableString(body.phone),
        whatsapp,
        taxId: CreateCustomerRequestDto.normalizeNullableString(body.taxId),
        taxRegime: CreateCustomerRequestDto.normalizeNullableString(body.taxRegime),
        billingStreet: CreateCustomerRequestDto.normalizeNullableString(body.billingStreet),
        billingCity: CreateCustomerRequestDto.normalizeNullableString(body.billingCity),
        billingState: CreateCustomerRequestDto.normalizeNullableString(body.billingState),
        billingPostalCode: CreateCustomerRequestDto.normalizeNullableString(body.billingPostalCode),
        billingCountry: CreateCustomerRequestDto.normalizeNullableString(body.billingCountry),
        profileStatus,
        notes: CreateCustomerRequestDto.normalizeNullableString(body.notes),
      }),
    ];
  }

  private static normalizeRequiredString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  private static normalizeNullableString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private static normalizeEmail(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim().toLowerCase() : null;
  }
}
