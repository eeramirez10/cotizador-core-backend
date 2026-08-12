import { Currency, PurchaseCostSource } from "../../../infrastructure/database/generated/enums";

interface CreateQuoteItemRequestDtoProps {
  clientItemId: string;
  productId: string | null;
  externalProductCode: string | null;
  ean: string | null;
  customerDescription: string | null;
  customerDescriptionOriginal: string | null;
  customerDescriptionEditedAt: string | null;
  customerUnit: string | null;
  erpDescription: string | null;
  unit: string;
  qty: number;
  stock: number | null;
  deliveryTime: string | null;
  itemComment: string | null;
  sellerSupplierId: string | null;
  sellerSupplierNameSnapshot: string | null;
  sellerQuotedUnitCost: number | null;
  sellerCostSource?: PurchaseCostSource | null;
  sellerQuotedCurrency: Currency | null;
  sellerQuotedExchangeRate: number | null;
  sellerQuotedBrand: string | null;
  sellerSupplierDescription: string | null;
  sellerSupplierOrigin: string | null;
  sellerSupplierQuoteValidUntil: Date | null;
  sellerSupplierQuoteReference: string | null;
  sellerSupplierQuoteNotes: string | null;
  sellerOriginRestrictions: string[];
  sellerDeliveryState: string | null;
  sellerSupplierDeliveryTime: string | null;
  purchaseStandard: string | null;
  purchaseDiameter: string | null;
  purchaseThickness: string | null;
  purchaseBore: string | null;
  technicalFamily: string | null;
  technicalAttributes: Record<string, string>;
  cost: number;
  costCurrency: Currency;
  erpSaleCurrency: Currency | null;
  marginPct?: number;
  sourceCurrency?: Currency | null;
  sourceUnitPrice?: number | null;
  sourceSubtotal?: number | null;
  unitPrice?: number;
  sourceRequiresReview: boolean;
  requiresReview: boolean;
}

export class CreateQuoteItemRequestDto {
  public readonly clientItemId: string;
  public readonly productId: string | null;
  public readonly externalProductCode: string | null;
  public readonly ean: string | null;
  public readonly customerDescription: string | null;
  public readonly customerDescriptionOriginal: string | null;
  public readonly customerDescriptionEditedAt: string | null;
  public readonly customerUnit: string | null;
  public readonly erpDescription: string | null;
  public readonly unit: string;
  public readonly qty: number;
  public readonly stock: number | null;
  public readonly deliveryTime: string | null;
  public readonly itemComment: string | null;
  public readonly sellerSupplierId: string | null;
  public readonly sellerSupplierNameSnapshot: string | null;
  public readonly sellerQuotedUnitCost: number | null;
  public readonly sellerCostSource: PurchaseCostSource | null;
  public readonly sellerQuotedCurrency: Currency | null;
  public readonly sellerQuotedExchangeRate: number | null;
  public readonly sellerQuotedBrand: string | null;
  public readonly sellerSupplierDescription: string | null;
  public readonly sellerSupplierOrigin: string | null;
  public readonly sellerSupplierQuoteValidUntil: Date | null;
  public readonly sellerSupplierQuoteReference: string | null;
  public readonly sellerSupplierQuoteNotes: string | null;
  public readonly sellerOriginRestrictions: string[];
  public readonly sellerDeliveryState: string | null;
  public readonly sellerSupplierDeliveryTime: string | null;
  public readonly purchaseStandard: string | null;
  public readonly purchaseDiameter: string | null;
  public readonly purchaseThickness: string | null;
  public readonly purchaseBore: string | null;
  public readonly technicalFamily: string | null;
  public readonly technicalAttributes: Record<string, string>;
  public readonly cost: number;
  public readonly costCurrency: Currency;
  public readonly erpSaleCurrency: Currency | null;
  public readonly marginPct?: number;
  public readonly sourceCurrency?: Currency | null;
  public readonly sourceUnitPrice?: number | null;
  public readonly sourceSubtotal?: number | null;
  public readonly unitPrice?: number;
  public readonly sourceRequiresReview: boolean;
  public readonly requiresReview: boolean;

  constructor(props: CreateQuoteItemRequestDtoProps) {
    this.clientItemId = props.clientItemId;
    this.productId = props.productId;
    this.externalProductCode = props.externalProductCode;
    this.ean = props.ean;
    this.customerDescription = props.customerDescription;
    this.customerDescriptionOriginal = props.customerDescriptionOriginal;
    this.customerDescriptionEditedAt = props.customerDescriptionEditedAt;
    this.customerUnit = props.customerUnit;
    this.erpDescription = props.erpDescription;
    this.unit = props.unit;
    this.qty = props.qty;
    this.stock = props.stock;
    this.deliveryTime = props.deliveryTime;
    this.itemComment = props.itemComment;
    this.sellerSupplierId = props.sellerSupplierId;
    this.sellerSupplierNameSnapshot = props.sellerSupplierNameSnapshot;
    this.sellerQuotedUnitCost = props.sellerQuotedUnitCost;
    this.sellerCostSource = (props.sellerQuotedUnitCost ?? 0) > 0
      ? props.sellerCostSource ?? PurchaseCostSource.ESTIMATED
      : props.externalProductCode
        ? PurchaseCostSource.ERP_COST
        : null;
    this.sellerQuotedCurrency = props.sellerQuotedCurrency;
    this.sellerQuotedExchangeRate = props.sellerQuotedExchangeRate;
    this.sellerQuotedBrand = props.sellerQuotedBrand;
    this.sellerSupplierDescription = props.sellerSupplierDescription;
    this.sellerSupplierOrigin = props.sellerSupplierOrigin;
    this.sellerSupplierQuoteValidUntil = props.sellerSupplierQuoteValidUntil;
    this.sellerSupplierQuoteReference = props.sellerSupplierQuoteReference;
    this.sellerSupplierQuoteNotes = props.sellerSupplierQuoteNotes;
    this.sellerOriginRestrictions = props.sellerOriginRestrictions;
    this.sellerDeliveryState = props.sellerDeliveryState;
    this.sellerSupplierDeliveryTime = props.sellerSupplierDeliveryTime;
    this.purchaseStandard = props.purchaseStandard;
    this.purchaseDiameter = props.purchaseDiameter;
    this.purchaseThickness = props.purchaseThickness;
    this.purchaseBore = props.purchaseBore;
    this.technicalFamily = props.technicalFamily;
    this.technicalAttributes = props.technicalAttributes;
    this.cost = props.cost;
    this.costCurrency = props.costCurrency;
    this.erpSaleCurrency = props.erpSaleCurrency;
    this.marginPct = props.marginPct;
    this.sourceCurrency = props.sourceCurrency;
    this.sourceUnitPrice = props.sourceUnitPrice;
    this.sourceSubtotal = props.sourceSubtotal;
    this.unitPrice = props.unitPrice;
    this.sourceRequiresReview = props.sourceRequiresReview;
    this.requiresReview = props.requiresReview;
  }

  static create(input: unknown): [string?, CreateQuoteItemRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    const clientItemId = typeof body.clientItemId === "string" ? body.clientItemId.trim() : "";
    if (!clientItemId || clientItemId.length > 80) return ["clientItemId must contain between 1 and 80 characters."];
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
    const externalProductCode = CreateQuoteItemRequestDto.normalizeNullableString(body.externalProductCode);
    let erpSaleCurrency: Currency | null = null;
    if (externalProductCode) {
      const saleCurrencyRaw = typeof body.erpSaleCurrency === "string"
        ? body.erpSaleCurrency.trim().toUpperCase()
        : costCurrencyRaw;
      if (!Object.values(Currency).includes(saleCurrencyRaw as Currency)) {
        return ["erpSaleCurrency is invalid."];
      }
      erpSaleCurrency = saleCurrencyRaw as Currency;
    }

    const marginPct = CreateQuoteItemRequestDto.parseOptionalNumber(body.marginPct);
    const sourceUnitPrice = CreateQuoteItemRequestDto.parseOptionalNumber(body.sourceUnitPrice);
    const sourceSubtotal = CreateQuoteItemRequestDto.parseOptionalNumber(body.sourceSubtotal);
    const unitPrice = CreateQuoteItemRequestDto.parseOptionalNumber(body.unitPrice);
    const stock = CreateQuoteItemRequestDto.parseOptionalNumber(body.stock);
    const sellerQuotedUnitCost = CreateQuoteItemRequestDto.parseOptionalNumber(body.sellerQuotedUnitCost);
    const sellerQuotedExchangeRate = CreateQuoteItemRequestDto.parseOptionalNumber(body.sellerQuotedExchangeRate);

    if (typeof marginPct !== "undefined" && (!Number.isFinite(marginPct) || marginPct < -100)) {
      return ["marginPct is invalid."];
    }
    if (typeof unitPrice !== "undefined" && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
      return ["unitPrice is invalid."];
    }
    if (typeof stock !== "undefined" && !Number.isFinite(stock)) {
      return ["stock is invalid."];
    }
    if (typeof sourceUnitPrice !== "undefined" && (!Number.isFinite(sourceUnitPrice) || sourceUnitPrice < 0)) {
      return ["sourceUnitPrice is invalid."];
    }
    if (typeof sourceSubtotal !== "undefined" && (!Number.isFinite(sourceSubtotal) || sourceSubtotal < 0)) {
      return ["sourceSubtotal is invalid."];
    }
    if (typeof sellerQuotedUnitCost !== "undefined" && (!Number.isFinite(sellerQuotedUnitCost) || sellerQuotedUnitCost < 0)) {
      return ["sellerQuotedUnitCost is invalid."];
    }
    if (typeof sellerQuotedExchangeRate !== "undefined" && (!Number.isFinite(sellerQuotedExchangeRate) || sellerQuotedExchangeRate <= 0)) {
      return ["sellerQuotedExchangeRate is invalid."];
    }
    const sellerSupplierQuoteValidUntil = CreateQuoteItemRequestDto.parseNullableDate(body.sellerSupplierQuoteValidUntil);
    if (sellerSupplierQuoteValidUntil === "INVALID") return ["sellerSupplierQuoteValidUntil is invalid."];

    let sourceCurrency: Currency | null | undefined;
    if (typeof body.sourceCurrency !== "undefined") {
      if (body.sourceCurrency === null || body.sourceCurrency === "") {
        sourceCurrency = null;
      } else {
        const raw = typeof body.sourceCurrency === "string" ? body.sourceCurrency.trim().toUpperCase() : "";
        if (!Object.values(Currency).includes(raw as Currency)) return ["sourceCurrency is invalid."];
        sourceCurrency = raw as Currency;
      }
    }

    let sellerQuotedCurrency: Currency | null = null;
    if (body.sellerQuotedCurrency !== undefined && body.sellerQuotedCurrency !== null && body.sellerQuotedCurrency !== "") {
      const raw = typeof body.sellerQuotedCurrency === "string" ? body.sellerQuotedCurrency.trim().toUpperCase() : "";
      if (!Object.values(Currency).includes(raw as Currency)) return ["sellerQuotedCurrency is invalid."];
      sellerQuotedCurrency = raw as Currency;
    }
    let sellerCostSource: PurchaseCostSource | null = null;
    if (body.sellerCostSource !== undefined && body.sellerCostSource !== null && body.sellerCostSource !== "") {
      const raw = typeof body.sellerCostSource === "string" ? body.sellerCostSource.trim().toUpperCase() : "";
      if (!Object.values(PurchaseCostSource).includes(raw as PurchaseCostSource)) {
        return ["sellerCostSource is invalid."];
      }
      sellerCostSource = raw as PurchaseCostSource;
    }
    const normalizedSellerCostSource: PurchaseCostSource | null = (sellerQuotedUnitCost ?? 0) > 0
      ? sellerCostSource ?? PurchaseCostSource.ESTIMATED
      : externalProductCode
        ? PurchaseCostSource.ERP_COST
        : null;
    const sellerOriginRestrictions = Array.isArray(body.sellerOriginRestrictions)
      ? [...new Set(body.sellerOriginRestrictions
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean))]
      : [];
    const technicalAttributes = body.technicalAttributes && typeof body.technicalAttributes === "object" && !Array.isArray(body.technicalAttributes)
      ? Object.fromEntries(
          Object.entries(body.technicalAttributes as Record<string, unknown>)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string")
            .map(([key, value]) => [key.trim(), value.trim()])
            .filter(([key, value]) => Boolean(key && value)),
        )
      : {};

    return [
      ,
      new CreateQuoteItemRequestDto({
        clientItemId,
        productId: CreateQuoteItemRequestDto.normalizeNullableString(body.productId),
        externalProductCode,
        ean: CreateQuoteItemRequestDto.normalizeNullableString(body.ean),
        customerDescription: CreateQuoteItemRequestDto.normalizeNullableString(body.customerDescription),
        customerDescriptionOriginal: CreateQuoteItemRequestDto.normalizeNullableString(
          body.customerDescriptionOriginal
        ),
        customerDescriptionEditedAt: CreateQuoteItemRequestDto.normalizeNullableString(
          body.customerDescriptionEditedAt
        ),
        customerUnit: CreateQuoteItemRequestDto.normalizeNullableString(body.customerUnit),
        erpDescription: CreateQuoteItemRequestDto.normalizeNullableString(body.erpDescription),
        unit,
        qty,
        stock: typeof stock === "undefined" ? null : stock,
        deliveryTime: CreateQuoteItemRequestDto.normalizeNullableString(body.deliveryTime),
        itemComment: CreateQuoteItemRequestDto.normalizeNullableString(body.itemComment),
        sellerSupplierId: CreateQuoteItemRequestDto.normalizeNullableString(body.sellerSupplierId),
        sellerSupplierNameSnapshot: CreateQuoteItemRequestDto.normalizeNullableString(body.sellerSupplierNameSnapshot),
        sellerQuotedUnitCost: typeof sellerQuotedUnitCost === "undefined" ? null : sellerQuotedUnitCost,
        sellerCostSource: normalizedSellerCostSource,
        sellerQuotedCurrency,
        sellerQuotedExchangeRate: typeof sellerQuotedExchangeRate === "undefined" ? null : sellerQuotedExchangeRate,
        sellerQuotedBrand: CreateQuoteItemRequestDto.normalizeNullableString(body.sellerQuotedBrand),
        sellerSupplierDescription: CreateQuoteItemRequestDto.normalizeNullableString(body.sellerSupplierDescription),
        sellerSupplierOrigin: CreateQuoteItemRequestDto.normalizeNullableString(body.sellerSupplierOrigin),
        sellerSupplierQuoteValidUntil,
        sellerSupplierQuoteReference: CreateQuoteItemRequestDto.normalizeNullableString(body.sellerSupplierQuoteReference),
        sellerSupplierQuoteNotes: CreateQuoteItemRequestDto.normalizeNullableString(body.sellerSupplierQuoteNotes),
        sellerOriginRestrictions,
        sellerDeliveryState: CreateQuoteItemRequestDto.normalizeNullableString(body.sellerDeliveryState),
        sellerSupplierDeliveryTime: CreateQuoteItemRequestDto.normalizeNullableString(body.sellerSupplierDeliveryTime),
        purchaseStandard: CreateQuoteItemRequestDto.normalizeNullableString(body.purchaseStandard),
        purchaseDiameter: CreateQuoteItemRequestDto.normalizeNullableString(body.purchaseDiameter),
        purchaseThickness: CreateQuoteItemRequestDto.normalizeNullableString(body.purchaseThickness),
        purchaseBore: CreateQuoteItemRequestDto.normalizeNullableString(body.purchaseBore),
        technicalFamily: CreateQuoteItemRequestDto.normalizeNullableString(body.technicalFamily),
        technicalAttributes,
        cost,
        costCurrency: externalProductCode ? "MXN" as Currency : costCurrencyRaw as Currency,
        erpSaleCurrency,
        marginPct,
        sourceCurrency,
        sourceUnitPrice: typeof sourceUnitPrice === "undefined" ? undefined : sourceUnitPrice,
        sourceSubtotal: typeof sourceSubtotal === "undefined" ? undefined : sourceSubtotal,
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

  private static parseNullableDate(value: unknown): Date | null | "INVALID" {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string" && !(value instanceof Date)) return "INVALID";
    const parsed = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? "INVALID" : parsed;
  }
}
