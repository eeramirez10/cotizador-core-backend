import { Currency } from "../../../infrastructure/database/generated/enums";
import { isAllowedMeasurementUnit } from "../../constants/measurement-unit.constants";

interface LocalProductItemInput {
  itemId: string;
  description: string;
  unit: string | null;
  currency?: Currency;
  averageCost: number | null;
  lastCost: number | null;
  stock: number | null;
  eanSuggested: string | null;
}

interface CreateLocalProductsFromItemsRequestDtoProps {
  branchCode?: string;
  defaultCurrency: Currency;
  items: LocalProductItemInput[];
}

export class CreateLocalProductsFromItemsRequestDto {
  public readonly branchCode?: string;
  public readonly defaultCurrency: Currency;
  public readonly items: LocalProductItemInput[];

  constructor(props: CreateLocalProductsFromItemsRequestDtoProps) {
    this.branchCode = props.branchCode;
    this.defaultCurrency = props.defaultCurrency;
    this.items = props.items;
  }

  static create(input: unknown): [string?, CreateLocalProductsFromItemsRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    const defaultCurrencyRaw =
      typeof body.defaultCurrency === "string" && body.defaultCurrency.trim().length > 0
        ? body.defaultCurrency.trim().toUpperCase()
        : "USD";
    if (!Object.values(Currency).includes(defaultCurrencyRaw as Currency)) {
      return ["defaultCurrency is invalid."];
    }

    const branchCode =
      typeof body.branchCode === "string" && body.branchCode.trim().length > 0
        ? body.branchCode.trim().toUpperCase()
        : undefined;

    const itemsRaw = body.items;
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return ["items must be a non-empty array."];
    }

    const items: LocalProductItemInput[] = [];
    for (let i = 0; i < itemsRaw.length; i += 1) {
      const raw = itemsRaw[i];
      if (!raw || typeof raw !== "object") {
        return [`items[${i}] is invalid.`];
      }

      const row = raw as Record<string, unknown>;
      const itemId = CreateLocalProductsFromItemsRequestDto.normalizeRequiredString(
        row.itemId ?? row.item_id
      );
      const description = CreateLocalProductsFromItemsRequestDto.normalizeRequiredString(
        row.description ??
          row.descriptionNormalized ??
          row.description_normalized ??
          row.descriptionOriginal ??
          row.description_original
      );
      const rawUnit = CreateLocalProductsFromItemsRequestDto.normalizeNullableString(
        row.unit ??
          row.unitNormalized ??
          row.unit_normalized ??
          row.unitOriginal ??
          row.unit_original
      );
      const unit = rawUnit ? rawUnit.toUpperCase() : null;

      if (!itemId) return [`items[${i}].itemId is required.`];
      if (!description) return [`items[${i}].description is required.`];
      if (unit && !isAllowedMeasurementUnit(unit)) {
        return [`items[${i}].unit is invalid.`];
      }

      const currencyRaw = CreateLocalProductsFromItemsRequestDto.normalizeNullableString(
        row.currency
      );
      const currency = currencyRaw ? currencyRaw.toUpperCase() : undefined;
      if (currency && !Object.values(Currency).includes(currency as Currency)) {
        return [`items[${i}].currency is invalid.`];
      }

      const averageCost = CreateLocalProductsFromItemsRequestDto.parseNullableNumber(row.averageCost);
      if (typeof averageCost === "number" && (!Number.isFinite(averageCost) || averageCost < 0)) {
        return [`items[${i}].averageCost must be greater than or equal to 0.`];
      }

      const lastCost = CreateLocalProductsFromItemsRequestDto.parseNullableNumber(row.lastCost);
      if (typeof lastCost === "number" && (!Number.isFinite(lastCost) || lastCost < 0)) {
        return [`items[${i}].lastCost must be greater than or equal to 0.`];
      }

      const stock = CreateLocalProductsFromItemsRequestDto.parseNullableNumber(row.stock);
      if (typeof stock === "number" && (!Number.isFinite(stock) || stock < 0)) {
        return [`items[${i}].stock must be greater than or equal to 0.`];
      }

      const eanSuggested = CreateLocalProductsFromItemsRequestDto.normalizeNullableString(
        row.eanSuggested ?? row.ean_suggested ?? row.ean
      );

      items.push({
        itemId,
        description,
        unit,
        currency: currency as Currency | undefined,
        averageCost,
        lastCost,
        stock,
        eanSuggested,
      });
    }

    return [
      ,
      new CreateLocalProductsFromItemsRequestDto({
        branchCode,
        defaultCurrency: defaultCurrencyRaw as Currency,
        items,
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
