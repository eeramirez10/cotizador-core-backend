import {
  CustomerProfileStatus,
  CustomerSource,
} from "../../../infrastructure/database/generated/enums";
import { CustomerContactWriteDto } from "./customer-contact-write.dto";

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
  billingExteriorNumber: string | null;
  billingInteriorNumber: string | null;
  billingNeighborhood: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  profileStatus: CustomerProfileStatus;
  notes: string | null;
  contacts: CustomerContactWriteDto[];
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
  public readonly billingExteriorNumber: string | null;
  public readonly billingInteriorNumber: string | null;
  public readonly billingNeighborhood: string | null;
  public readonly billingCity: string | null;
  public readonly billingState: string | null;
  public readonly billingPostalCode: string | null;
  public readonly billingCountry: string | null;
  public readonly profileStatus: CustomerProfileStatus;
  public readonly notes: string | null;
  public readonly contacts: CustomerContactWriteDto[];

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
    const email = CreateCustomerRequestDto.normalizeEmail(body.email);

    if (!firstName) return ["firstName is required."];
    if (!lastName) return ["lastName is required."];
    if (email && !CreateCustomerRequestDto.isValidEmail(email)) return ["email is invalid."];
    if (whatsapp && !CreateCustomerRequestDto.isValidPhone(whatsapp)) return ["whatsapp is invalid."];

    const phone = CreateCustomerRequestDto.normalizeNullableString(body.phone);
    if (phone && !CreateCustomerRequestDto.isValidPhone(phone)) return ["phone is invalid."];

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

    const [contactsError, contacts = []] = CustomerContactWriteDto.parseMany(body.contacts);
    if (contactsError) return [contactsError];
    if (source !== "ERP" && !email && !whatsapp && !CustomerContactWriteDto.hasDeliveryChannel(contacts)) {
      return ["At least one email or WhatsApp is required."];
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
        email,
        phone,
        whatsapp,
        taxId: CreateCustomerRequestDto.normalizeNullableString(body.taxId),
        taxRegime: CreateCustomerRequestDto.normalizeNullableString(body.taxRegime),
        billingStreet: CreateCustomerRequestDto.normalizeNullableString(body.billingStreet),
        billingExteriorNumber: CreateCustomerRequestDto.normalizeNullableString(body.billingExteriorNumber),
        billingInteriorNumber: CreateCustomerRequestDto.normalizeNullableString(body.billingInteriorNumber),
        billingNeighborhood: CreateCustomerRequestDto.normalizeNullableString(body.billingNeighborhood),
        billingCity: CreateCustomerRequestDto.normalizeNullableString(body.billingCity),
        billingState: CreateCustomerRequestDto.normalizeNullableString(body.billingState),
        billingPostalCode: CreateCustomerRequestDto.normalizeNullableString(body.billingPostalCode),
        billingCountry: CreateCustomerRequestDto.normalizeNullableString(body.billingCountry),
        profileStatus,
        notes: CreateCustomerRequestDto.normalizeNullableString(body.notes),
        contacts,
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
