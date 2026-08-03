import {
  CustomerProfileStatus,
  CustomerSource,
} from "../../../infrastructure/database/generated/enums";
import { CustomerContactWriteDto } from "./customer-contact-write.dto";

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
  billingExteriorNumber?: string | null;
  billingInteriorNumber?: string | null;
  billingNeighborhood?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  profileStatus?: CustomerProfileStatus;
  notes?: string | null;
  contacts?: CustomerContactWriteDto[];
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
  public readonly billingExteriorNumber?: string | null;
  public readonly billingInteriorNumber?: string | null;
  public readonly billingNeighborhood?: string | null;
  public readonly billingCity?: string | null;
  public readonly billingState?: string | null;
  public readonly billingPostalCode?: string | null;
  public readonly billingCountry?: string | null;
  public readonly profileStatus?: CustomerProfileStatus;
  public readonly notes?: string | null;
  public readonly contacts?: CustomerContactWriteDto[];

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
    this.billingExteriorNumber = props.billingExteriorNumber;
    this.billingInteriorNumber = props.billingInteriorNumber;
    this.billingNeighborhood = props.billingNeighborhood;
    this.billingCity = props.billingCity;
    this.billingState = props.billingState;
    this.billingPostalCode = props.billingPostalCode;
    this.billingCountry = props.billingCountry;
    this.profileStatus = props.profileStatus;
    this.notes = props.notes;
    this.contacts = props.contacts;
  }

  static create(input: unknown): [string?, UpdateCustomerRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    const [contactsError, contacts] = CustomerContactWriteDto.parseMany(body.contacts);
    if (contactsError) return [contactsError];
    if (contacts && !CustomerContactWriteDto.hasDeliveryChannel(contacts)) {
      return ["At least one customer contact must have email or WhatsApp."];
    }

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
      billingExteriorNumber: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingExteriorNumber),
      billingInteriorNumber: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingInteriorNumber),
      billingNeighborhood: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingNeighborhood),
      billingCity: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingCity),
      billingState: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingState),
      billingPostalCode: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingPostalCode),
      billingCountry: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.billingCountry),
      profileStatus: UpdateCustomerRequestDto.normalizeProfileStatus(body.profileStatus),
      notes: UpdateCustomerRequestDto.normalizeNullableStringWhenDefined(body.notes),
      contacts,
    });

    if (typeof body.source !== "undefined" && !dto.source) return ["source is invalid."];
    if (typeof body.profileStatus !== "undefined" && !dto.profileStatus) {
      return ["profileStatus is invalid."];
    }
    if (typeof body.firstName !== "undefined" && !dto.firstName) return ["firstName cannot be empty."];
    if (typeof body.lastName !== "undefined" && !dto.lastName) return ["lastName cannot be empty."];
    if (dto.email && !UpdateCustomerRequestDto.isValidEmail(dto.email)) return ["email is invalid."];
    if (dto.whatsapp && !UpdateCustomerRequestDto.isValidPhone(dto.whatsapp)) return ["whatsapp is invalid."];
    if (dto.phone && !UpdateCustomerRequestDto.isValidPhone(dto.phone)) return ["phone is invalid."];

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

  private static isValidEmail(value: string): boolean {
    return /^\S+@\S+\.\S+$/.test(value);
  }

  private static isValidPhone(value: string): boolean {
    const trimmed = value.trim();
    if (!/^\+?[\d\s().-]+$/.test(trimmed)) return false;
    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }
}
