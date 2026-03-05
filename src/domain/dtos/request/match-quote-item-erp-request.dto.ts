import { Currency } from "../../../infrastructure/database/generated/enums";

interface MatchQuoteItemErpRequestDtoProps {
  productId: string | null;
  externalProductCode: string;
  ean: string | null;
  erpDescription: string;
  unit: string;
  stock: number | null;
  cost: number;
  costCurrency: Currency;
  deliveryTime: string | null;
  qty?: number;
  unitPrice?: number;
  marginPct?: number;
}

export class MatchQuoteItemErpRequestDto {
  public readonly productId: string | null;
  public readonly externalProductCode: string;
  public readonly ean: string | null;
  public readonly erpDescription: string;
  public readonly unit: string;
  public readonly stock: number | null;
  public readonly cost: number;
  public readonly costCurrency: Currency;
  public readonly deliveryTime: string | null;
  public readonly qty?: number;
  public readonly unitPrice?: number;
  public readonly marginPct?: number;

  constructor(props: MatchQuoteItemErpRequestDtoProps) {
    this.productId = props.productId;
    this.externalProductCode = props.externalProductCode;
    this.ean = props.ean;
    this.erpDescription = props.erpDescription;
    this.unit = props.unit;
    this.stock = props.stock;
    this.cost = props.cost;
    this.costCurrency = props.costCurrency;
    this.deliveryTime = props.deliveryTime;
    this.qty = props.qty;
    this.unitPrice = props.unitPrice;
    this.marginPct = props.marginPct;
  }

  static create(input: unknown): [string?, MatchQuoteItemErpRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const externalProductCode =
      typeof body.externalProductCode === "string" ? body.externalProductCode.trim() : "";
    if (!externalProductCode) return ["externalProductCode is required."];

    const erpDescription =
      typeof body.erpDescription === "string" ? body.erpDescription.trim() : "";
    if (!erpDescription) return ["erpDescription is required."];

    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    if (!unit) return ["unit is required."];

    const cost = MatchQuoteItemErpRequestDto.parseNumber(body.cost);
    if (!Number.isFinite(cost) || cost < 0) {
      return ["cost must be greater than or equal to 0."];
    }

    const costCurrencyRaw =
      typeof body.costCurrency === "string" ? body.costCurrency.trim().toUpperCase() : "";
    if (!Object.values(Currency).includes(costCurrencyRaw as Currency)) {
      return ["costCurrency is invalid."];
    }

    const stock = MatchQuoteItemErpRequestDto.parseOptionalNumber(body.stock);
    if (typeof stock !== "undefined" && !Number.isFinite(stock)) {
      return ["stock is invalid."];
    }

    const qty = MatchQuoteItemErpRequestDto.parseOptionalNumber(body.qty);
    if (typeof qty !== "undefined" && (!Number.isFinite(qty) || qty <= 0)) {
      return ["qty must be greater than 0."];
    }

    const unitPrice = MatchQuoteItemErpRequestDto.parseOptionalNumber(body.unitPrice);
    if (typeof unitPrice !== "undefined" && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      return ["unitPrice is invalid."];
    }

    const marginPct = MatchQuoteItemErpRequestDto.parseOptionalNumber(body.marginPct);
    if (typeof marginPct !== "undefined" && (!Number.isFinite(marginPct) || marginPct < -100)) {
      return ["marginPct is invalid."];
    }

    return [
      ,
      new MatchQuoteItemErpRequestDto({
        productId: MatchQuoteItemErpRequestDto.normalizeNullableString(body.productId),
        externalProductCode,
        ean: MatchQuoteItemErpRequestDto.normalizeNullableString(body.ean),
        erpDescription,
        unit,
        stock: typeof stock === "undefined" ? null : stock,
        cost,
        costCurrency: costCurrencyRaw as Currency,
        deliveryTime: MatchQuoteItemErpRequestDto.normalizeNullableString(body.deliveryTime),
        qty,
        unitPrice,
        marginPct,
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
    return MatchQuoteItemErpRequestDto.parseNumber(value);
  }
}
