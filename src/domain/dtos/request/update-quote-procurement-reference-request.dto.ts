import type { Currency, PurchaseCostSource } from "../../../infrastructure/database/generated/enums";

const optionalText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export class UpdateQuoteProcurementReferenceRequestDto {
  private constructor(
    public readonly sellerSupplierId: string,
    public readonly sellerSupplierName: string,
    public readonly sellerQuotedUnitCost: number,
    public readonly sellerCostSource: PurchaseCostSource,
    public readonly sellerQuotedCurrency: Currency,
    public readonly sellerQuotedExchangeRate: number | null,
    public readonly sellerQuotedBrand: string | null,
    public readonly sellerSupplierDescription: string | null,
    public readonly sellerSupplierOrigin: string | null,
    public readonly sellerSupplierQuoteValidUntil: Date | null,
    public readonly sellerSupplierQuoteReference: string | null,
    public readonly sellerSupplierQuoteNotes: string | null,
    public readonly sellerOriginRestrictions: string[],
    public readonly sellerDeliveryState: string,
    public readonly sellerSupplierDeliveryTime: string,
    public readonly purchaseStandard: string | null,
    public readonly purchaseDiameter: string | null,
    public readonly purchaseThickness: string | null,
    public readonly purchaseBore: string | null,
    public readonly technicalFamily: string | null,
    public readonly technicalAttributes: Record<string, string>,
  ) {}

  static create(input: unknown): [string?, UpdateQuoteProcurementReferenceRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const supplierId = optionalText(body.sellerSupplierId);
    const supplierName = optionalText(body.sellerSupplierName);
    const unitCost = Number(body.sellerQuotedUnitCost);
    const costSource = body.sellerCostSource;
    const currency = body.sellerQuotedCurrency;
    const exchangeRate = body.sellerQuotedExchangeRate === null || body.sellerQuotedExchangeRate === ""
      ? null
      : Number(body.sellerQuotedExchangeRate);
    const deliveryState = optionalText(body.sellerDeliveryState);
    const deliveryTime = optionalText(body.sellerSupplierDeliveryTime);
    if (!supplierId) return ["sellerSupplierId is required."];
    if (!supplierName) return ["sellerSupplierName is required."];
    if (!Number.isFinite(unitCost) || unitCost <= 0) return ["sellerQuotedUnitCost must be greater than zero."];
    if (!["ERP_COST", "SELLER_SUPPLIER_QUOTE", "PRICE_LIST", "ESTIMATED"].includes(String(costSource))) {
      return ["sellerCostSource is invalid."];
    }
    if (currency !== "MXN" && currency !== "USD") return ["sellerQuotedCurrency is invalid."];
    if (currency === "USD" && (!exchangeRate || !Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
      return ["sellerQuotedExchangeRate is required for USD references."];
    }
    if (!deliveryState) return ["sellerDeliveryState is required."];
    if (!deliveryTime) return ["sellerSupplierDeliveryTime is required."];

    let validUntil: Date | null = null;
    if (body.sellerSupplierQuoteValidUntil) {
      if (typeof body.sellerSupplierQuoteValidUntil !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.sellerSupplierQuoteValidUntil)) {
        return ["sellerSupplierQuoteValidUntil is invalid."];
      }
      validUntil = new Date(`${body.sellerSupplierQuoteValidUntil}T00:00:00.000Z`);
      if (Number.isNaN(validUntil.getTime())) return ["sellerSupplierQuoteValidUntil is invalid."];
    }

    const restrictions = Array.isArray(body.sellerOriginRestrictions)
      ? [...new Set(body.sellerOriginRestrictions.filter((value): value is string => typeof value === "string").map((value) => value.trim().toUpperCase()).filter(Boolean))]
      : [];
    const technicalAttributes = body.technicalAttributes && typeof body.technicalAttributes === "object" && !Array.isArray(body.technicalAttributes)
      ? Object.fromEntries(Object.entries(body.technicalAttributes as Record<string, unknown>)
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          .map(([key, value]) => [key.trim(), value.trim()])
          .filter(([key, value]) => Boolean(key && value)))
      : {};

    return [, new UpdateQuoteProcurementReferenceRequestDto(
      supplierId, supplierName, unitCost, costSource as PurchaseCostSource, currency, currency === "USD" ? exchangeRate : null,
      optionalText(body.sellerQuotedBrand), optionalText(body.sellerSupplierDescription),
      optionalText(body.sellerSupplierOrigin), validUntil,
      optionalText(body.sellerSupplierQuoteReference), optionalText(body.sellerSupplierQuoteNotes),
      restrictions, deliveryState, deliveryTime,
      optionalText(body.purchaseStandard), optionalText(body.purchaseDiameter),
      optionalText(body.purchaseThickness), optionalText(body.purchaseBore),
      optionalText(body.technicalFamily), technicalAttributes,
    )];
  }
}
