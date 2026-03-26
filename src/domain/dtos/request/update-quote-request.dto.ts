import { Currency, QuoteOrigin } from "../../../infrastructure/database/generated/enums";

interface UpdateQuoteRequestDtoProps {
  customerId?: string;
  currency?: Currency;
  exchangeRate?: number;
  exchangeRateDate?: Date;
  taxRate?: number;
  deliveryPlace?: string | null;
  paymentTerms?: string;
  validityDays?: number;
  origin?: QuoteOrigin;
  notes?: string | null;
}

export class UpdateQuoteRequestDto {
  public readonly customerId?: string;
  public readonly currency?: Currency;
  public readonly exchangeRate?: number;
  public readonly exchangeRateDate?: Date;
  public readonly taxRate?: number;
  public readonly deliveryPlace?: string | null;
  public readonly paymentTerms?: string;
  public readonly validityDays?: number;
  public readonly origin?: QuoteOrigin;
  public readonly notes?: string | null;

  constructor(props: UpdateQuoteRequestDtoProps) {
    this.customerId = props.customerId;
    this.currency = props.currency;
    this.exchangeRate = props.exchangeRate;
    this.exchangeRateDate = props.exchangeRateDate;
    this.taxRate = props.taxRate;
    this.deliveryPlace = props.deliveryPlace;
    this.paymentTerms = props.paymentTerms;
    this.validityDays = props.validityDays;
    this.origin = props.origin;
    this.notes = props.notes;
  }

  static create(input: unknown): [string?, UpdateQuoteRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    if (Object.keys(body).length === 0) {
      return ["At least one field is required to update quote."];
    }

    const customerId =
      typeof body.customerId === "undefined"
        ? undefined
        : typeof body.customerId === "string"
          ? body.customerId.trim()
          : "";
    if (typeof body.customerId !== "undefined" && !customerId) {
      return ["customerId cannot be empty."];
    }

    let currency: Currency | undefined;
    if (typeof body.currency !== "undefined") {
      const raw = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
      if (!Object.values(Currency).includes(raw as Currency)) {
        return ["currency is invalid."];
      }
      currency = raw as Currency;
    }

    let exchangeRate: number | undefined;
    if (typeof body.exchangeRate !== "undefined") {
      exchangeRate = UpdateQuoteRequestDto.parseNumber(body.exchangeRate);
      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        return ["exchangeRate must be greater than 0."];
      }
    }

    let exchangeRateDate: Date | undefined;
    if (typeof body.exchangeRateDate !== "undefined") {
      const raw = typeof body.exchangeRateDate === "string" ? body.exchangeRateDate.trim() : "";
      if (!raw) return ["exchangeRateDate cannot be empty."];
      exchangeRateDate = new Date(raw);
      if (Number.isNaN(exchangeRateDate.getTime())) {
        return ["exchangeRateDate is invalid."];
      }
    }

    let taxRate: number | undefined;
    if (typeof body.taxRate !== "undefined") {
      taxRate = UpdateQuoteRequestDto.parseNumber(body.taxRate);
      if (!Number.isFinite(taxRate) || taxRate < 0) {
        return ["taxRate must be greater than or equal to 0."];
      }
    }

    const deliveryPlace =
      typeof body.deliveryPlace === "undefined"
        ? undefined
        : typeof body.deliveryPlace === "string" && body.deliveryPlace.trim().length > 0
          ? body.deliveryPlace.trim()
          : null;

    const paymentTerms =
      typeof body.paymentTerms === "undefined"
        ? undefined
        : typeof body.paymentTerms === "string" && body.paymentTerms.trim().length > 0
          ? body.paymentTerms.trim()
          : "CONTADO";

    let validityDays: number | undefined;
    if (typeof body.validityDays !== "undefined") {
      validityDays = Math.trunc(UpdateQuoteRequestDto.parseNumber(body.validityDays));
      if (!Number.isFinite(validityDays) || validityDays < 1 || validityDays > 180) {
        return ["validityDays must be an integer between 1 and 180."];
      }
    }

    let origin: QuoteOrigin | undefined;
    if (typeof body.origin !== "undefined") {
      const raw = typeof body.origin === "string" ? body.origin.trim().toUpperCase() : "";
      if (!Object.values(QuoteOrigin).includes(raw as QuoteOrigin)) {
        return ["origin is invalid."];
      }
      origin = raw as QuoteOrigin;
    }

    const notes =
      typeof body.notes === "undefined"
        ? undefined
        : typeof body.notes === "string" && body.notes.trim().length > 0
          ? body.notes.trim()
          : null;

    return [
      ,
      new UpdateQuoteRequestDto({
        customerId: customerId || undefined,
        currency,
        exchangeRate,
        exchangeRateDate,
        taxRate,
        deliveryPlace,
        paymentTerms,
        validityDays,
        origin,
        notes,
      }),
    ];
  }

  private static parseNumber(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    }
    return Number.NaN;
  }
}
