import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UpdateQuoteItemRequestDto } from "../dtos/request/update-quote-item-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";
import { isQuoteItemReady } from "./quote-item-review.helper";
import { getQuoteItemEffectiveCostAudit, getQuoteItemEffectiveUnitCost } from "./quote-item-fulfillment.helper";

interface UpdateQuoteItemActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const round4 = (value: number): number => Number(value.toFixed(4));
const computeUnitPrice = (cost: number, marginPct: number): number => round4(cost * (1 + marginPct / 100));
const computeMarginPct = (cost: number, unitPrice: number): number => {
  if (cost === 0) return 0;
  return round4(((unitPrice - cost) / cost) * 100);
};
const canEditItems = (status: string): boolean => ["DRAFT", "PENDING", "CHANGES_REQUESTED"].includes(status);

export class UpdateQuoteItemUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(
    quoteId: string,
    itemId: string,
    dto: UpdateQuoteItemRequestDto,
    actor: UpdateQuoteItemActorContext
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteRepository.findById({
      id: quoteId,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
    });
    if (!quote) throw new Error("Quote not found.");
    if (quote.archivedAt) throw new Error("Archived quotes are read-only.");
    if (quote.captureMethod === "EXCEL_IMPORT") {
      throw new Error("Items from Excel-imported quotes are read-only.");
    }
    if (!canEditItems(quote.status)) throw new Error("Quote items cannot be edited in current status.");

    const existingItem = quote.items.find((item) => item.id === itemId);
    if (!existingItem) throw new Error("Quote item not found.");

    const qty = typeof dto.qty === "number" ? dto.qty : existingItem.qty;
    const cost = typeof dto.cost === "number" ? dto.cost : existingItem.cost;
    const requestedCostCurrency = dto.costCurrency !== undefined ? dto.costCurrency : existingItem.costCurrency;
    const nextStock = dto.stock !== undefined ? dto.stock : existingItem.stock;
    const nextExternalProductCode = dto.externalProductCode !== undefined
      ? dto.externalProductCode
      : existingItem.externalProductCode;
    const costCurrency = nextExternalProductCode ? "MXN" : requestedCostCurrency;
    const erpSaleCurrency = nextExternalProductCode
      ? dto.erpSaleCurrency ?? existingItem.erpSaleCurrency ?? requestedCostCurrency
      : null;
    const nextSellerQuotedUnitCost = dto.sellerQuotedUnitCost !== undefined
      ? dto.sellerQuotedUnitCost
      : existingItem.sellerQuotedUnitCost;
    const nextSellerQuotedCurrency = dto.sellerQuotedCurrency !== undefined
      ? dto.sellerQuotedCurrency
      : existingItem.sellerQuotedCurrency;
    const nextSellerQuotedExchangeRate = dto.sellerQuotedExchangeRate !== undefined
      ? dto.sellerQuotedExchangeRate
      : existingItem.sellerQuotedExchangeRate;
    const effectiveCostInput = {
      qty,
      stock: nextStock,
      externalProductCode: nextExternalProductCode,
      cost,
      costCurrency,
      sellerQuotedUnitCost: nextSellerQuotedUnitCost,
      sellerQuotedCurrency: nextSellerQuotedCurrency,
      sellerQuotedExchangeRate: nextSellerQuotedExchangeRate,
    };
    const quoteCurrencyCost = getQuoteItemEffectiveUnitCost(effectiveCostInput, quote.currency, quote.exchangeRate);

    const hasUnitPrice = typeof dto.unitPrice === "number";
    const hasMarginPct = typeof dto.marginPct === "number";

    let unitPrice: number;
    let marginPct: number;

    if (hasUnitPrice && hasMarginPct) {
      unitPrice = round4(dto.unitPrice!);
      marginPct = computeMarginPct(quoteCurrencyCost, unitPrice);
    } else if (hasUnitPrice) {
      unitPrice = round4(dto.unitPrice!);
      marginPct = computeMarginPct(quoteCurrencyCost, unitPrice);
    } else if (hasMarginPct) {
      marginPct = round4(dto.marginPct!);
      unitPrice = computeUnitPrice(quoteCurrencyCost, marginPct);
    } else {
      unitPrice = round4(existingItem.unitPrice);
      marginPct = typeof dto.cost === "number" || dto.costCurrency !== undefined
        ? computeMarginPct(quoteCurrencyCost, unitPrice)
        : round4(existingItem.marginPct);
    }

    const subtotal = round4(qty * unitPrice);
    const effectiveCostAudit = getQuoteItemEffectiveCostAudit(
      { ...effectiveCostInput, unitPrice },
      quote.currency,
      quote.exchangeRate
    );
    const nextProductId = dto.productId !== undefined ? dto.productId : existingItem.productId;
    const nextEan = dto.ean !== undefined ? dto.ean : existingItem.ean;
    const nextErpDescription =
      dto.erpDescription !== undefined ? dto.erpDescription : existingItem.erpDescription;
    const nextCustomerDescription =
      dto.customerDescription !== undefined ? dto.customerDescription : existingItem.customerDescription;
    const customerDescriptionChanged = dto.customerDescription !== undefined
      && (dto.customerDescription ?? "").trim() !== (existingItem.customerDescription ?? "").trim();
    const nextDeliveryTime =
      dto.deliveryTime !== undefined ? dto.deliveryTime : existingItem.deliveryTime;
    const nextUnit = dto.unit !== undefined ? dto.unit : existingItem.unit;
    const readinessInput = {
      productId: nextProductId,
      externalProductCode: nextExternalProductCode,
      ean: nextEan,
      erpDescription: nextErpDescription,
      customerDescription: nextCustomerDescription,
      qty,
      unit: nextUnit,
      unitPrice,
      deliveryTime: nextDeliveryTime,
    };
    const requiresReview = !isQuoteItemReady(readinessInput);

    const updatedQuote = await this.quoteRepository.updateItem({
      quoteId,
      itemId,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
      data: {
        productId: nextProductId,
        externalProductCode: nextExternalProductCode,
        ean: nextEan,
        customerDescription: nextCustomerDescription,
        customerDescriptionEditedAt: customerDescriptionChanged
          ? new Date()
          : existingItem.customerDescriptionEditedAt,
        customerDescriptionEditedByUserId: customerDescriptionChanged
          ? actor.id
          : existingItem.customerDescriptionEditedByUserId,
        customerUnit: dto.customerUnit !== undefined ? dto.customerUnit : existingItem.customerUnit,
        erpDescription: nextErpDescription,
        unit: nextUnit,
        qty,
        stock: nextStock,
        deliveryTime: nextDeliveryTime,
        itemComment: dto.itemComment !== undefined ? dto.itemComment : existingItem.itemComment,
        sellerSupplierId: dto.sellerSupplierId,
        sellerSupplierNameSnapshot: dto.sellerSupplierNameSnapshot,
        sellerQuotedUnitCost: dto.sellerQuotedUnitCost,
        sellerQuotedCurrency: dto.sellerQuotedCurrency,
        sellerQuotedExchangeRate: dto.sellerQuotedExchangeRate,
        sellerQuotedBrand: dto.sellerQuotedBrand,
        sellerSupplierDescription: dto.sellerSupplierDescription,
        sellerSupplierOrigin: dto.sellerSupplierOrigin,
        sellerSupplierQuoteValidUntil: dto.sellerSupplierQuoteValidUntil,
        sellerSupplierQuoteReference: dto.sellerSupplierQuoteReference,
        sellerSupplierQuoteNotes: dto.sellerSupplierQuoteNotes,
        sellerOriginRestrictions: dto.sellerOriginRestrictions,
        sellerDeliveryState: dto.sellerDeliveryState,
        sellerSupplierDeliveryTime: dto.sellerSupplierDeliveryTime,
        purchaseStandard: dto.purchaseStandard,
        purchaseDiameter: dto.purchaseDiameter,
        purchaseThickness: dto.purchaseThickness,
        purchaseBore: dto.purchaseBore,
        cost: round4(cost),
        costCurrency,
        erpSaleCurrency,
        marginPct,
        effectiveCostAtQuote: round4(effectiveCostAudit.effectiveCostAtQuote),
        isBelowEffectiveCost: effectiveCostAudit.isBelowEffectiveCost,
        effectiveCostVariance: round4(effectiveCostAudit.effectiveCostVariance),
        effectiveCostVariancePct: round4(effectiveCostAudit.effectiveCostVariancePct),
        effectiveCostEvaluatedAt: new Date(),
        effectiveCostEvaluatedByUserId: actor.id,
        unitPrice,
        subtotal,
        sourceRequiresReview:
          dto.sourceRequiresReview !== undefined ? dto.sourceRequiresReview : existingItem.sourceRequiresReview,
        requiresReview,
        updatedByUserId: actor.id,
      },
    });

    if (!updatedQuote) throw new Error("Quote item not found.");
    return new QuoteResponseDto(updatedQuote);
  }
}
