import { Currency } from "../../../infrastructure/database/generated/enums";

interface CreateQuoteItemRequestDtoProps {
  productId: string | null;
  externalProductCode: string | null;
  ean: string | null;
  customerDescription: string | null;
  customerUnit: string | null;
  erpDescription: string | null;
  unit: string;
  qty: number;
  stock: number | null;
  deliveryTime: string | null;
  cost: number;
  costCurrency: Currency;
  marginPct?: number;
  unitPrice?: number;
  sourceRequiresReview: boolean;
  requiresReview: boolean;
}

export class CreateQuoteItemRequestDto {
  public readonly productId: string | null;
  public readonly externalProductCode: string | null;
  public readonly ean: string | null;
  public readonly customerDescription: string | null;
  public readonly customerUnit: string | null;
  public readonly erpDescription: string | null;
  public readonly unit: string;
  public readonly qty: number;
  public readonly stock: number | null;
  public readonly deliveryTime: string | null;
  public readonly cost: number;
  public readonly costCurrency: Currency;
  public readonly marginPct?: number;
  public readonly unitPrice?: number;
  public readonly sourceRequiresReview: boolean;
  public readonly requiresReview: boolean;

  constructor(props: CreateQuoteItemRequestDtoProps) {
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

  static create(input: unknown): [string?, CreateQuoteItemRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    if (!unit) return ["unit is required."];

    const qty = CreateQuoteItemRequestDto.parseNumber(body.qty);
    if (!Number.isFinite(qty) || qty <= 0) return ["qty must be greater than 0."];

    const cost = CreateQuoteItemRequestDto.parseNumber(body.cost);
    if (!Number.isFinite(cost) || cost < 0) return ["cost must be greater than or equal to 0."];

    const costCurrencyRaw =
      typeof body.costCurrency === "string" ? body.costCurrency.trim().toUpperCase() : "";
    if (!Object.values(Currency).includes(costCurrencyRaw as Currency)) {
      return ["costCurrency is invalid."];
    }

    const marginPct = CreateQuoteItemRequestDto.parseOptionalNumber(body.marginPct);
    const unitPrice = CreateQuoteItemRequestDto.parseOptionalNumber(body.unitPrice);
    const stock = CreateQuoteItemRequestDto.parseOptionalNumber(body.stock);

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
      new CreateQuoteItemRequestDto({
        productId: CreateQuoteItemRequestDto.normalizeNullableString(body.productId),
        externalProductCode: CreateQuoteItemRequestDto.normalizeNullableString(body.externalProductCode),
        ean: CreateQuoteItemRequestDto.normalizeNullableString(body.ean),
        customerDescription: CreateQuoteItemRequestDto.normalizeNullableString(body.customerDescription),
        customerUnit: CreateQuoteItemRequestDto.normalizeNullableString(body.customerUnit),
        erpDescription: CreateQuoteItemRequestDto.normalizeNullableString(body.erpDescription),
        unit,
        qty,
        stock: typeof stock === "undefined" ? null : stock,
        deliveryTime: CreateQuoteItemRequestDto.normalizeNullableString(body.deliveryTime),
        cost,
        costCurrency: costCurrencyRaw as Currency,
        marginPct,
        unitPrice,
        sourceRequiresReview: Boolean(body.sourceRequiresReview),
        requiresReview: Boolean(body.requiresReview),
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
    return CreateQuoteItemRequestDto.parseNumber(value);
  }
}
