import {
  Currency,
  QuoteCaptureMethod,
  QuoteOrigin,
  QuoteSourceChannel,
} from "../../../infrastructure/database/generated/enums";

interface CreateQuoteRequestDtoProps {
  customerId: string;
  customerContactId: string | null;
  branchCode?: string;
  currency: Currency;
  exchangeRate: number;
  exchangeRateDate: Date;
  taxRate: number;
  deliveryPlace: string | null;
  paymentTerms: string;
  commercialConditions: string | null;
  validityDays: number;
  origin: QuoteOrigin;
  captureMethod: QuoteCaptureMethod;
  originalQuoteDate: Date | null;
  sourceChannel: QuoteSourceChannel;
  providedByUserId: string | null;
  notes: string | null;
}

export class CreateQuoteRequestDto {
  public readonly customerId: string;
  public readonly customerContactId: string | null;
  public readonly branchCode?: string;
  public readonly currency: Currency;
  public readonly exchangeRate: number;
  public readonly exchangeRateDate: Date;
  public readonly taxRate: number;
  public readonly deliveryPlace: string | null;
  public readonly paymentTerms: string;
  public readonly commercialConditions: string | null;
  public readonly validityDays: number;
  public readonly origin: QuoteOrigin;
  public readonly captureMethod: QuoteCaptureMethod;
  public readonly originalQuoteDate: Date | null;
  public readonly sourceChannel: QuoteSourceChannel;
  public readonly providedByUserId: string | null;
  public readonly notes: string | null;

  constructor(props: CreateQuoteRequestDtoProps) {
    this.customerId = props.customerId;
    this.customerContactId = props.customerContactId;
    this.branchCode = props.branchCode;
    this.currency = props.currency;
    this.exchangeRate = props.exchangeRate;
    this.exchangeRateDate = props.exchangeRateDate;
    this.taxRate = props.taxRate;
    this.deliveryPlace = props.deliveryPlace;
    this.paymentTerms = props.paymentTerms;
    this.commercialConditions = props.commercialConditions;
    this.validityDays = props.validityDays;
    this.origin = props.origin;
    this.captureMethod = props.captureMethod;
    this.originalQuoteDate = props.originalQuoteDate;
    this.sourceChannel = props.sourceChannel;
    this.providedByUserId = props.providedByUserId;
    this.notes = props.notes;
  }

  static create(input: unknown): [string?, CreateQuoteRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    if (!customerId) return ["customerId is required."];
    const customerContactId = typeof body.customerContactId === "string" && body.customerContactId.trim()
      ? body.customerContactId.trim()
      : null;

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

    const deliveryPlace =
      typeof body.deliveryPlace === "string" && body.deliveryPlace.trim().length > 0
        ? body.deliveryPlace.trim()
        : null;

    if (typeof body.paymentTerms !== "string" || body.paymentTerms.trim().length === 0) {
      return ["paymentTerms is required."];
    }
    const paymentTerms = body.paymentTerms.trim();

    const commercialConditions =
      typeof body.commercialConditions === "string" && body.commercialConditions.trim().length > 0
        ? body.commercialConditions.trim()
        : null;
    if (commercialConditions && commercialConditions.length > 5000) {
      return ["commercialConditions must not exceed 5000 characters."];
    }

    if (typeof body.validityDays === "undefined" || body.validityDays === null) {
      return ["validityDays is required."];
    }
    const validityDaysInput = body.validityDays;
    const validityDays = Math.trunc(CreateQuoteRequestDto.parseNumber(validityDaysInput));
    if (!Number.isFinite(validityDays) || validityDays < 1 || validityDays > 180) {
      return ["validityDays must be an integer between 1 and 180."];
    }

    const originRaw =
      typeof body.origin === "string" && body.origin.trim().length > 0
        ? body.origin.trim().toUpperCase()
        : "MANUAL";

    if (!Object.values(QuoteOrigin).includes(originRaw as QuoteOrigin)) {
      return ["origin is invalid."];
    }

    const captureMethodRaw =
      typeof body.captureMethod === "string" && body.captureMethod.trim().length > 0
        ? body.captureMethod.trim().toUpperCase()
        : "SYSTEM";
    if (!Object.values(QuoteCaptureMethod).includes(captureMethodRaw as QuoteCaptureMethod)) {
      return ["captureMethod is invalid."];
    }

    const originalQuoteDateRaw =
      typeof body.originalQuoteDate === "string" ? body.originalQuoteDate.trim() : "";
    const originalQuoteDate = originalQuoteDateRaw ? new Date(originalQuoteDateRaw) : null;
    if (originalQuoteDate && Number.isNaN(originalQuoteDate.getTime())) {
      return ["originalQuoteDate is invalid."];
    }
    if (captureMethodRaw === "EXCEL_IMPORT" && !originalQuoteDate) {
      return ["originalQuoteDate is required for EXCEL_IMPORT."];
    }

    const sourceChannelRaw =
      typeof body.sourceChannel === "string" && body.sourceChannel.trim().length > 0
        ? body.sourceChannel.trim().toUpperCase()
        : "UNSPECIFIED";

    if (!Object.values(QuoteSourceChannel).includes(sourceChannelRaw as QuoteSourceChannel)) {
      return ["sourceChannel is invalid."];
    }

    const providedByUserId =
      typeof body.providedByUserId === "undefined" || body.providedByUserId === null
        ? null
        : typeof body.providedByUserId === "string"
          ? body.providedByUserId.trim()
          : "";
    if (typeof body.providedByUserId !== "undefined" && body.providedByUserId !== null && !providedByUserId) {
      return ["providedByUserId is invalid."];
    }

    const notes =
      typeof body.notes === "string" && body.notes.trim().length > 0 ? body.notes.trim() : null;

    return [
      ,
      new CreateQuoteRequestDto({
        customerId,
        customerContactId,
        branchCode,
        currency,
        exchangeRate,
        exchangeRateDate,
        taxRate,
        deliveryPlace,
        paymentTerms,
        commercialConditions,
        validityDays,
        origin: originRaw as QuoteOrigin,
        captureMethod: captureMethodRaw as QuoteCaptureMethod,
        originalQuoteDate,
        sourceChannel: sourceChannelRaw as QuoteSourceChannel,
        providedByUserId,
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
