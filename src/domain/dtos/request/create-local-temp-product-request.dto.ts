import { Currency } from "../../../infrastructure/database/generated/enums";
import { normalizeMeasurementUnit } from "../../constants/measurement-unit.constants";
import { normalizeOptionalCatalogText, parseTechnicalAttributes } from "../../utils/product-catalog-fields";

interface CreateLocalTempProductRequestDtoProps {
  description: string;
  commercialDescription: string | null;
  family: string | null;
  subfamily: string | null;
  brand: string | null;
  technicalAttributes: Record<string, string>;
  unit: string;
  currency: Currency;
  averageCost: number | null;
  lastCost: number | null;
  stock: number | null;
  ean: string | null;
  branchCode?: string;
}

export class CreateLocalTempProductRequestDto {
  public readonly description: string;
  public readonly commercialDescription: string | null;
  public readonly family: string | null;
  public readonly subfamily: string | null;
  public readonly brand: string | null;
  public readonly technicalAttributes: Record<string, string>;
  public readonly unit: string;
  public readonly currency: Currency;
  public readonly averageCost: number | null;
  public readonly lastCost: number | null;
  public readonly stock: number | null;
  public readonly ean: string | null;
  public readonly branchCode?: string;

  constructor(props: CreateLocalTempProductRequestDtoProps) {
    this.description = props.description;
    this.commercialDescription = props.commercialDescription;
    this.family = props.family;
    this.subfamily = props.subfamily;
    this.brand = props.brand;
    this.technicalAttributes = props.technicalAttributes;
    this.unit = props.unit;
    this.currency = props.currency;
    this.averageCost = props.averageCost;
    this.lastCost = props.lastCost;
    this.stock = props.stock;
    this.ean = props.ean;
    this.branchCode = props.branchCode;
  }

  static create(input: unknown): [string?, CreateLocalTempProductRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    const description = CreateLocalTempProductRequestDto.normalizeRequiredString(body.description);
    const rawUnit = CreateLocalTempProductRequestDto.normalizeRequiredString(body.unit);
    const unit = normalizeMeasurementUnit(rawUnit);
    if (!description) return ["description is required."];
    if (!rawUnit) return ["unit is required."];
    if (!unit) return ["unit is invalid."];

    const [technicalError, technicalAttributes = {}] = parseTechnicalAttributes(body.technicalAttributes);
    if (technicalError) return [technicalError];

    const currencyRaw =
      typeof body.currency === "string" && body.currency.trim().length > 0
        ? body.currency.trim().toUpperCase()
        : "USD";
    if (!Object.values(Currency).includes(currencyRaw as Currency)) {
      return ["currency is invalid."];
    }

    const averageCost = CreateLocalTempProductRequestDto.parseNullableNumber(body.averageCost);
    if (typeof averageCost === "number" && (!Number.isFinite(averageCost) || averageCost < 0)) {
      return ["averageCost must be greater than or equal to 0."];
    }

    const lastCost = CreateLocalTempProductRequestDto.parseNullableNumber(body.lastCost);
    if (typeof lastCost === "number" && (!Number.isFinite(lastCost) || lastCost < 0)) {
      return ["lastCost must be greater than or equal to 0."];
    }

    const stock = CreateLocalTempProductRequestDto.parseNullableNumber(body.stock);
    if (typeof stock === "number" && (!Number.isFinite(stock) || stock < 0)) {
      return ["stock must be greater than or equal to 0."];
    }

    const branchCode =
      typeof body.branchCode === "string" && body.branchCode.trim().length > 0
        ? body.branchCode.trim().toUpperCase()
        : undefined;

    return [
      ,
      new CreateLocalTempProductRequestDto({
        description,
        commercialDescription: normalizeOptionalCatalogText(body.commercialDescription, 500) ?? null,
        family: normalizeOptionalCatalogText(body.family, 80) ?? null,
        subfamily: normalizeOptionalCatalogText(body.subfamily, 120) ?? null,
        brand: normalizeOptionalCatalogText(body.brand, 120) ?? null,
        technicalAttributes,
        unit,
        currency: currencyRaw as Currency,
        averageCost,
        lastCost,
        stock,
        ean: CreateLocalTempProductRequestDto.normalizeNullableString(body.ean),
        branchCode,
      }),
    ];
  }

  private static normalizeRequiredString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  private static normalizeNullableString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private static parseNullableNumber(value: unknown): number | null {
    if (typeof value === "undefined" || value === null || value === "") return null;
    if (typeof value === "number") return Number.isNaN(value) ? Number.NaN : value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    }
    return Number.NaN;
  }
}
