import {
  Currency,
  QuoteCaptureMethod,
  QuoteOrigin,
  QuoteSourceChannel,
} from "../../../infrastructure/database/generated/enums";
import { normalizeMeasurementUnit } from "../../constants/measurement-unit.constants";

interface ExtractionItemDto {
  descriptionOriginal: string | null;
  descriptionNormalized: string | null;
  quantity: number | null;
  unitOriginal: string | null;
  unitNormalized: string | null;
  requiresReview: boolean;
}

interface CreateQuoteFromExtractionRequestDtoProps {
  customerId: string;
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
  items: ExtractionItemDto[];
}

export class CreateQuoteFromExtractionRequestDto {
  public readonly customerId: string;
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
  public readonly items: ExtractionItemDto[];

  constructor(props: CreateQuoteFromExtractionRequestDtoProps) {
    this.customerId = props.customerId;
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
    this.items = props.items;
  }

  static create(input: unknown): [string?, CreateQuoteFromExtractionRequestDto?] {
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

    const exchangeRate = CreateQuoteFromExtractionRequestDto.parseNumber(body.exchangeRate);
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

    const taxRate = CreateQuoteFromExtractionRequestDto.parseNumber(body.taxRate);
    if (!Number.isFinite(taxRate) || taxRate < 0) {
      return ["taxRate must be greater than or equal to 0."];
    }

    const deliveryPlace =
      typeof body.deliveryPlace === "string" && body.deliveryPlace.trim().length > 0
        ? body.deliveryPlace.trim()
        : null;

    const paymentTerms =
      typeof body.paymentTerms === "string" && body.paymentTerms.trim().length > 0
        ? body.paymentTerms.trim()
        : "CONTADO";

    const commercialConditions =
      typeof body.commercialConditions === "string" && body.commercialConditions.trim().length > 0
        ? body.commercialConditions.trim()
        : null;
    if (commercialConditions && commercialConditions.length > 5000) {
      return ["commercialConditions must not exceed 5000 characters."];
    }

    const validityDaysInput = body.validityDays ?? 10;
    const validityDays = Math.trunc(CreateQuoteFromExtractionRequestDto.parseNumber(validityDaysInput));
    if (!Number.isFinite(validityDays) || validityDays < 1 || validityDays > 180) {
      return ["validityDays must be an integer between 1 and 180."];
    }

    const originRaw =
      typeof body.origin === "string" && body.origin.trim().length > 0
        ? body.origin.trim().toUpperCase()
        : "FILE_UPLOAD";
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

    const itemsRaw = body.items;
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return ["items must be a non-empty array."];
    }

    const items: ExtractionItemDto[] = [];
    for (let i = 0; i < itemsRaw.length; i += 1) {
      const raw = itemsRaw[i];
      if (!raw || typeof raw !== "object") {
        return [`items[${i}] is invalid.`];
      }

      const row = raw as Record<string, unknown>;

      const descriptionOriginal = CreateQuoteFromExtractionRequestDto.normalizeNullableString(
        row.description_original ?? row.descriptionOriginal
      );
      const descriptionNormalized = CreateQuoteFromExtractionRequestDto.normalizeNullableString(
        row.description_normalizada ??
          row.description_normalized ??
          row.descriptionNormalized ??
          row.description
      );
      const unitOriginal = CreateQuoteFromExtractionRequestDto.normalizeNullableString(
        row.unidad_original ?? row.unit_original ?? row.unitOriginal
      );
      const unitNormalizedRaw = CreateQuoteFromExtractionRequestDto.normalizeNullableString(
        row.unidad_normalizada ?? row.unit_normalized ?? row.unitNormalized ?? row.unit
      );
      const unitNormalized = normalizeMeasurementUnit(unitNormalizedRaw ?? unitOriginal);

      const quantity = CreateQuoteFromExtractionRequestDto.parseOptionalNumber(
        row.cantidad ?? row.quantity ?? row.qty
      );
      if (typeof quantity !== "undefined" && (!Number.isFinite(quantity) || quantity <= 0)) {
        return [`items[${i}].quantity is invalid.`];
      }

      const requiresReviewRaw =
        row.requiere_revision ?? row.requires_review ?? row.requiresReview ?? false;
      const requiresReview = Boolean(requiresReviewRaw);

      if (!descriptionOriginal && !descriptionNormalized) {
        return [`items[${i}] must include at least one description field.`];
      }

      items.push({
        descriptionOriginal,
        descriptionNormalized,
        quantity: typeof quantity === "undefined" ? null : quantity,
        unitOriginal,
        unitNormalized,
        requiresReview: requiresReview || unitNormalized === null,
      });
    }

    return [
      ,
      new CreateQuoteFromExtractionRequestDto({
        customerId,
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
        items,
      }),
    ];
  }

  private static normalizeNullableString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private static parseNumber(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    }
    return Number.NaN;
  }

  private static parseOptionalNumber(value: unknown): number | undefined {
    if (typeof value === "undefined" || value === null) return undefined;
    return CreateQuoteFromExtractionRequestDto.parseNumber(value);
  }
}
