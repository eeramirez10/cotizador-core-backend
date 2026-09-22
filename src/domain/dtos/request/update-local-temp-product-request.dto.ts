import {
  Currency,
  ProductCostSource,
  ProductCostStatus,
} from "../../../infrastructure/database/generated/enums";
import { normalizeMeasurementUnit } from "../../constants/measurement-unit.constants";
import { normalizeOptionalCatalogText, parseTechnicalAttributes } from "../../utils/product-catalog-fields";

interface UpdateLocalTempProductRequestDtoProps {
  code?: string | null;
  ean?: string | null;
  description?: string;
  commercialDescription?: string | null;
  family?: string | null;
  subfamily?: string | null;
  brand?: string | null;
  technicalAttributes?: Record<string, string>;
  unit?: string;
  currency?: Currency;
  averageCost?: number | null;
  lastCost?: number | null;
  costStatus?: ProductCostStatus;
  costSource?: ProductCostSource | null;
  stock?: number | null;
  isActive?: boolean;
}

export class UpdateLocalTempProductRequestDto {
  public readonly code?: string | null;
  public readonly ean?: string | null;
  public readonly description?: string;
  public readonly commercialDescription?: string | null;
  public readonly family?: string | null;
  public readonly subfamily?: string | null;
  public readonly brand?: string | null;
  public readonly technicalAttributes?: Record<string, string>;
  public readonly unit?: string;
  public readonly currency?: Currency;
  public readonly averageCost?: number | null;
  public readonly lastCost?: number | null;
  public readonly costStatus?: ProductCostStatus;
  public readonly costSource?: ProductCostSource | null;
  public readonly stock?: number | null;
  public readonly isActive?: boolean;

  constructor(props: UpdateLocalTempProductRequestDtoProps) {
    this.code = props.code;
    this.ean = props.ean;
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
    this.costStatus = props.costStatus;
    this.costSource = props.costSource;
    this.stock = props.stock;
    this.isActive = props.isActive;
  }

  static create(input: unknown): [string?, UpdateLocalTempProductRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const commercialDescription = normalizeOptionalCatalogText(body.commercialDescription, 500);
    const family = normalizeOptionalCatalogText(body.family, 80);
    const subfamily = normalizeOptionalCatalogText(body.subfamily, 120);
    const brand = normalizeOptionalCatalogText(body.brand, 120);
    const [technicalError, technicalAttributes] = parseTechnicalAttributes(body.technicalAttributes);
    if (technicalError) return [technicalError];

    const description = UpdateLocalTempProductRequestDto.normalizeOptionalString(body.description);
    if (typeof description === "string" && description.length === 0) {
      return ["description cannot be empty."];
    }

    const unitRaw = UpdateLocalTempProductRequestDto.normalizeOptionalString(body.unit);
    const normalizedUnit = typeof unitRaw === "string" ? normalizeMeasurementUnit(unitRaw) : undefined;
    if (unitRaw === "") {
      return ["unit cannot be empty."];
    }
    if (typeof unitRaw === "string" && normalizedUnit === null) {
      return ["unit is invalid."];
    }
    const unit = normalizedUnit ?? undefined;

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

    let costStatus: ProductCostStatus | undefined;
    if (typeof body.costStatus !== "undefined") {
      const normalized = typeof body.costStatus === "string" ? body.costStatus.trim().toUpperCase() : "";
      if (!Object.values(ProductCostStatus).includes(normalized as ProductCostStatus)) {
        return ["costStatus is invalid."];
      }
      costStatus = normalized as ProductCostStatus;
      if (costStatus === ProductCostStatus.CONFIRMED) {
        return ["Confirmed costs must be set through the procurement workflow."];
      }
    }

    let costSource: ProductCostSource | null | undefined;
    if (typeof body.costSource !== "undefined") {
      if (body.costSource === null || body.costSource === "") {
        costSource = null;
      } else {
        const normalized = typeof body.costSource === "string" ? body.costSource.trim().toUpperCase() : "";
        if (!Object.values(ProductCostSource).includes(normalized as ProductCostSource)) {
          return ["costSource is invalid."];
        }
        costSource = normalized as ProductCostSource;
        if (costSource === ProductCostSource.ERP || costSource === ProductCostSource.SUPPLIER_QUOTE) {
          return ["This cost source must be set through its corresponding workflow."];
        }
      }
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
      typeof commercialDescription !== "undefined" ||
      typeof family !== "undefined" ||
      typeof subfamily !== "undefined" ||
      typeof brand !== "undefined" ||
      typeof technicalAttributes !== "undefined" ||
      typeof unit !== "undefined" ||
      typeof currency !== "undefined" ||
      typeof averageCost !== "undefined" ||
      typeof lastCost !== "undefined" ||
      typeof costStatus !== "undefined" ||
      typeof costSource !== "undefined" ||
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
        commercialDescription,
        family,
        subfamily,
        brand,
        technicalAttributes,
        unit,
        currency,
        averageCost,
        lastCost,
        costStatus,
        costSource,
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
