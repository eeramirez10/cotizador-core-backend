import { Currency } from "../../../infrastructure/database/generated/enums";

interface UpdateQuoteItemRequestDtoProps {
  productId?: string | null;
  externalProductCode?: string | null;
  ean?: string | null;
  customerDescription?: string | null;
  customerUnit?: string | null;
  erpDescription?: string | null;
  unit?: string;
  qty?: number;
  stock?: number | null;
  deliveryTime?: string | null;
  cost?: number;
  costCurrency?: Currency;
  marginPct?: number;
  unitPrice?: number;
  sourceRequiresReview?: boolean;
  requiresReview?: boolean;
}

export class UpdateQuoteItemRequestDto {
  public readonly productId?: string | null;
  public readonly externalProductCode?: string | null;
  public readonly ean?: string | null;
  public readonly customerDescription?: string | null;
  public readonly customerUnit?: string | null;
  public readonly erpDescription?: string | null;
  public readonly unit?: string;
  public readonly qty?: number;
  public readonly stock?: number | null;
  public readonly deliveryTime?: string | null;
  public readonly cost?: number;
  public readonly costCurrency?: Currency;
  public readonly marginPct?: number;
  public readonly unitPrice?: number;
  public readonly sourceRequiresReview?: boolean;
  public readonly requiresReview?: boolean;

  constructor(props: UpdateQuoteItemRequestDtoProps) {
    this.productId = props.productId;
    this.externalProductCode = props.externalProductCode;
    this.ean = props.ean;
    this.customerDescription = props.customerDescription;
    this.customerUnit = props.customerUnit;
    this.erpDescription = props.erpDescription;
    this.unit = props.unit;
    this.qty = props.qty;
    this.stock = props.stock;
    this.deliveryTime = props.deliveryTime;
    this.cost = props.cost;
    this.costCurrency = props.costCurrency;
    this.marginPct = props.marginPct;
    this.unitPrice = props.unitPrice;
    this.sourceRequiresReview = props.sourceRequiresReview;
    this.requiresReview = props.requiresReview;
  }

  static create(input: unknown): [string?, UpdateQuoteItemRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    if (Object.keys(body).length === 0) {
      return ["At least one field is required to update item."];
    }

    let unit: string | undefined;
    if (typeof body.unit !== "undefined") {
      unit = typeof body.unit === "string" ? body.unit.trim() : "";
      if (!unit) return ["unit cannot be empty."];
    }

    const qty = UpdateQuoteItemRequestDto.parseOptionalNumber(body.qty);
    if (typeof qty !== "undefined" && (!Number.isFinite(qty) || qty <= 0)) {
      return ["qty must be greater than 0."];
    }

    const cost = UpdateQuoteItemRequestDto.parseOptionalNumber(body.cost);
    if (typeof cost !== "undefined" && (!Number.isFinite(cost) || cost < 0)) {
      return ["cost must be greater than or equal to 0."];
    }

    let costCurrency: Currency | undefined;
    if (typeof body.costCurrency !== "undefined") {
      const raw = typeof body.costCurrency === "string" ? body.costCurrency.trim().toUpperCase() : "";
      if (!Object.values(Currency).includes(raw as Currency)) {
        return ["costCurrency is invalid."];
      }
      costCurrency = raw as Currency;
    }

    const marginPct = UpdateQuoteItemRequestDto.parseOptionalNumber(body.marginPct);
    const unitPrice = UpdateQuoteItemRequestDto.parseOptionalNumber(body.unitPrice);
    const stock = UpdateQuoteItemRequestDto.parseOptionalNumber(body.stock);

    if (typeof marginPct !== "undefined" && (!Number.isFinite(marginPct) || marginPct < -100)) {
      return ["marginPct is invalid."];
    }
    if (typeof unitPrice !== "undefined" && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      return ["unitPrice is invalid."];
    }
    if (typeof stock !== "undefined" && !Number.isFinite(stock)) {
      return ["stock is invalid."];
    }

    return [
      ,
      new UpdateQuoteItemRequestDto({
        productId: UpdateQuoteItemRequestDto.normalizeNullableStringWhenDefined(body.productId),
        externalProductCode: UpdateQuoteItemRequestDto.normalizeNullableStringWhenDefined(
          body.externalProductCode
        ),
        ean: UpdateQuoteItemRequestDto.normalizeNullableStringWhenDefined(body.ean),
        customerDescription: UpdateQuoteItemRequestDto.normalizeNullableStringWhenDefined(
          body.customerDescription
        ),
        customerUnit: UpdateQuoteItemRequestDto.normalizeNullableStringWhenDefined(body.customerUnit),
        erpDescription: UpdateQuoteItemRequestDto.normalizeNullableStringWhenDefined(body.erpDescription),
        unit,
        qty,
        stock: typeof stock === "undefined" ? undefined : stock,
        deliveryTime: UpdateQuoteItemRequestDto.normalizeNullableStringWhenDefined(body.deliveryTime),
        cost,
        costCurrency,
        marginPct,
        unitPrice,
        sourceRequiresReview:
          typeof body.sourceRequiresReview === "undefined"
            ? undefined
            : Boolean(body.sourceRequiresReview),
        requiresReview: typeof body.requiresReview === "undefined" ? undefined : Boolean(body.requiresReview),
      }),
    ];
  }

  private static normalizeNullableStringWhenDefined(value: unknown): string | null | undefined {
    if (typeof value === "undefined") return undefined;
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
    return UpdateQuoteItemRequestDto.parseNumber(value);
  }
}
