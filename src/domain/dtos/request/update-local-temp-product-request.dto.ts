import { Currency } from "../../../infrastructure/database/generated/enums";
import { isAllowedMeasurementUnit } from "../../constants/measurement-unit.constants";

interface UpdateLocalTempProductRequestDtoProps {
  code?: string | null;
  ean?: string | null;
  description?: string;
  unit?: string;
  currency?: Currency;
  averageCost?: number | null;
  lastCost?: number | null;
  stock?: number | null;
  isActive?: boolean;
}

export class UpdateLocalTempProductRequestDto {
  public readonly code?: string | null;
  public readonly ean?: string | null;
  public readonly description?: string;
  public readonly unit?: string;
  public readonly currency?: Currency;
  public readonly averageCost?: number | null;
  public readonly lastCost?: number | null;
  public readonly stock?: number | null;
  public readonly isActive?: boolean;

  constructor(props: UpdateLocalTempProductRequestDtoProps) {
    this.code = props.code;
    this.ean = props.ean;
    this.description = props.description;
    this.unit = props.unit;
    this.currency = props.currency;
    this.averageCost = props.averageCost;
    this.lastCost = props.lastCost;
    this.stock = props.stock;
    this.isActive = props.isActive;
  }

  static create(input: unknown): [string?, UpdateLocalTempProductRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const description = UpdateLocalTempProductRequestDto.normalizeOptionalString(body.description);
    if (typeof description === "string" && description.length === 0) {
      return ["description cannot be empty."];
    }

    const unitRaw = UpdateLocalTempProductRequestDto.normalizeOptionalString(body.unit);
    const unit = typeof unitRaw === "string" ? unitRaw.toUpperCase() : undefined;
    if (typeof unit === "string" && unit.length === 0) {
      return ["unit cannot be empty."];
    }
    if (typeof unit === "string" && !isAllowedMeasurementUnit(unit)) {
      return ["unit is invalid."];
    }

    let currency: Currency | undefined;
    if (typeof body.currency !== "undefined") {
      const normalizedCurrency =
        typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
      if (!Object.values(Currency).includes(normalizedCurrency as Currency)) {
        return ["currency is invalid."];
      }
      currency = normalizedCurrency as Currency;
    }

    const averageCost = UpdateLocalTempProductRequestDto.parseOptionalNullableNumber(body.averageCost);
    if (typeof averageCost === "number" && (!Number.isFinite(averageCost) || averageCost < 0)) {
      return ["averageCost must be greater than or equal to 0."];
    }

    const lastCost = UpdateLocalTempProductRequestDto.parseOptionalNullableNumber(body.lastCost);
    if (typeof lastCost === "number" && (!Number.isFinite(lastCost) || lastCost < 0)) {
      return ["lastCost must be greater than or equal to 0."];
    }

    const stock = UpdateLocalTempProductRequestDto.parseOptionalNullableNumber(body.stock);
    if (typeof stock === "number" && (!Number.isFinite(stock) || stock < 0)) {
      return ["stock must be greater than or equal to 0."];
    }

    let isActive: boolean | undefined;
    if (typeof body.isActive !== "undefined") {
      if (typeof body.isActive !== "boolean") {
        return ["isActive must be boolean."];
      }
      isActive = body.isActive;
    }

    const code = UpdateLocalTempProductRequestDto.normalizeOptionalNullableString(
      body.code
    );
    const ean = UpdateLocalTempProductRequestDto.normalizeOptionalNullableString(
      body.ean
    );

    const hasAnyField =
      typeof code !== "undefined" ||
      typeof ean !== "undefined" ||
      typeof description !== "undefined" ||
      typeof unit !== "undefined" ||
      typeof currency !== "undefined" ||
      typeof averageCost !== "undefined" ||
      typeof lastCost !== "undefined" ||
      typeof stock !== "undefined" ||
      typeof isActive !== "undefined";

    if (!hasAnyField) {
      return ["At least one field is required to update."];
    }

    return [
      ,
      new UpdateLocalTempProductRequestDto({
        code,
        ean,
        description,
        unit,
        currency,
        averageCost,
        lastCost,
        stock,
        isActive,
      }),
    ];
  }

  private static normalizeOptionalString(value: unknown): string | undefined {
    if (typeof value === "undefined") return undefined;
    if (typeof value !== "string") return "";
    return value.trim();
  }

  private static normalizeOptionalNullableString(value: unknown): string | null | undefined {
    if (typeof value === "undefined") return undefined;
    if (value === null) return null;
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private static parseOptionalNullableNumber(value: unknown): number | null | undefined {
    if (typeof value === "undefined") return undefined;
    if (value === null || value === "") return null;
    if (typeof value === "number") return Number.isNaN(value) ? Number.NaN : value;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    }
    return Number.NaN;
  }
}
