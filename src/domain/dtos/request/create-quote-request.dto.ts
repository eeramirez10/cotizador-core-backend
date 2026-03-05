import { Currency, QuoteOrigin } from "../../../infrastructure/database/generated/enums";

interface CreateQuoteRequestDtoProps {
  customerId: string;
  branchCode?: string;
  currency: Currency;
  exchangeRate: number;
  exchangeRateDate: Date;
  taxRate: number;
  origin: QuoteOrigin;
  notes: string | null;
}

export class CreateQuoteRequestDto {
  public readonly customerId: string;
  public readonly branchCode?: string;
  public readonly currency: Currency;
  public readonly exchangeRate: number;
  public readonly exchangeRateDate: Date;
  public readonly taxRate: number;
  public readonly origin: QuoteOrigin;
  public readonly notes: string | null;

  constructor(props: CreateQuoteRequestDtoProps) {
    this.customerId = props.customerId;
    this.branchCode = props.branchCode;
    this.currency = props.currency;
    this.exchangeRate = props.exchangeRate;
    this.exchangeRateDate = props.exchangeRateDate;
    this.taxRate = props.taxRate;
    this.origin = props.origin;
    this.notes = props.notes;
  }

  static create(input: unknown): [string?, CreateQuoteRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    if (!customerId) return ["customerId is required."];

    const branchCode =
      typeof body.branchCode === "string" && body.branchCode.trim().length > 0
        ? body.branchCode.trim().toUpperCase()
        : undefined;

    const currencyRaw = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
    if (!Object.values(Currency).includes(currencyRaw as Currency)) {
      return ["currency is invalid."];
    }
    const currency = currencyRaw as Currency;

    const exchangeRate = CreateQuoteRequestDto.parseNumber(body.exchangeRate);
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      return ["exchangeRate must be greater than 0."];
    }

    const exchangeRateDateRaw =
      typeof body.exchangeRateDate === "string" ? body.exchangeRateDate.trim() : "";
    if (!exchangeRateDateRaw) return ["exchangeRateDate is required."];
    const exchangeRateDate = new Date(exchangeRateDateRaw);
    if (Number.isNaN(exchangeRateDate.getTime())) {
      return ["exchangeRateDate is invalid."];
    }

    const taxRate = CreateQuoteRequestDto.parseNumber(body.taxRate);
    if (!Number.isFinite(taxRate) || taxRate < 0) {
      return ["taxRate must be greater than or equal to 0."];
    }

    const originRaw =
      typeof body.origin === "string" && body.origin.trim().length > 0
        ? body.origin.trim().toUpperCase()
        : "MANUAL";

    if (!Object.values(QuoteOrigin).includes(originRaw as QuoteOrigin)) {
      return ["origin is invalid."];
    }

    const notes =
      typeof body.notes === "string" && body.notes.trim().length > 0 ? body.notes.trim() : null;

    return [
      ,
      new CreateQuoteRequestDto({
        customerId,
        branchCode,
        currency,
        exchangeRate,
        exchangeRateDate,
        taxRate,
        origin: originRaw as QuoteOrigin,
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
