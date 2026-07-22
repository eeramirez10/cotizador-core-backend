import { Currency } from "../../../infrastructure/database/generated/enums";

export class UpsertProcurementOfferRequestDto {
  constructor(
    public readonly supplierName: string,
    public readonly unitCost: number,
    public readonly currency: Currency,
    public readonly contactName: string | null,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly minimumQty: number | null,
    public readonly deliveryTime: string | null,
    public readonly validUntil: Date | null,
    public readonly notes: string | null,
  ) {}

  static create(input: unknown): [string?, UpsertProcurementOfferRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const supplierName = this.text(body.supplierName);
    const unitCost = Number(body.unitCost);
    const currencyRaw = this.text(body.currency).toUpperCase();
    const contactName = this.nullableText(body.contactName);
    const email = this.nullableText(body.email)?.toLowerCase() ?? null;
    const phone = this.nullableText(body.phone);
    const minimumQty = body.minimumQty === null || body.minimumQty === undefined || body.minimumQty === ""
      ? null
      : Number(body.minimumQty);
    const deliveryTime = this.nullableText(body.deliveryTime);
    const notes = this.nullableText(body.notes);
    const validUntilRaw = this.nullableText(body.validUntil);
    const validUntil = validUntilRaw ? new Date(`${validUntilRaw}T00:00:00.000Z`) : null;

    if (!supplierName) return ["supplierName is required."];
    if (supplierName.length > 220) return ["supplierName must contain at most 220 characters."];
    if (!Number.isFinite(unitCost) || unitCost <= 0) return ["unitCost must be greater than 0."];
    if (!Object.values(Currency).includes(currencyRaw as Currency)) return ["currency is invalid."];
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return ["email is invalid."];
    if (phone && !this.isValidPhone(phone)) return ["phone is invalid."];
    if (minimumQty !== null && (!Number.isFinite(minimumQty) || minimumQty <= 0)) {
      return ["minimumQty must be greater than 0."];
    }
    if (validUntil && Number.isNaN(validUntil.getTime())) return ["validUntil is invalid."];
    if (notes && notes.length > 2000) return ["notes must contain at most 2000 characters."];

    return [, new UpsertProcurementOfferRequestDto(
      supplierName.toUpperCase(),
      unitCost,
      currencyRaw as Currency,
      contactName,
      email,
      phone,
      minimumQty,
      deliveryTime,
      validUntil,
      notes,
    )];
  }

  private static text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  private static nullableText(value: unknown): string | null {
    const text = this.text(value);
    return text || null;
  }

  private static isValidPhone(value: string): boolean {
    if (!/^\+?[\d\s().-]+$/.test(value)) return false;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }
}
