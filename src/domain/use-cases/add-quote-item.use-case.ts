import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateQuoteItemRequestDto } from "../dtos/request/create-quote-item-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";
import { isQuoteItemReady } from "./quote-item-review.helper";
import { getQuoteItemEffectiveCostAudit, getQuoteItemEffectiveUnitCost } from "./quote-item-fulfillment.helper";

interface AddQuoteItemActorContext {
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

export class AddQuoteItemUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(
    quoteId: string,
    dto: CreateQuoteItemRequestDto,
    actor: AddQuoteItemActorContext
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

    let unitPrice: number;
    let marginPct: number;
    const quoteCurrencyCost = getQuoteItemEffectiveUnitCost({
      qty: dto.qty,
      stock: dto.stock,
      externalProductCode: dto.externalProductCode,
      cost: dto.cost,
      costCurrency: dto.costCurrency,
      sellerQuotedUnitCost: dto.sellerQuotedUnitCost,
      sellerQuotedCurrency: dto.sellerQuotedCurrency,
      sellerQuotedExchangeRate: dto.sellerQuotedExchangeRate,
    }, quote.currency, quote.exchangeRate);

    if (typeof dto.unitPrice === "number" && typeof dto.marginPct === "number") {
      unitPrice = round4(dto.unitPrice);
      marginPct = computeMarginPct(quoteCurrencyCost, unitPrice);
    } else if (typeof dto.unitPrice === "number") {
      unitPrice = round4(dto.unitPrice);
      marginPct = computeMarginPct(quoteCurrencyCost, unitPrice);
    } else if (typeof dto.marginPct === "number") {
      marginPct = round4(dto.marginPct);
      unitPrice = computeUnitPrice(quoteCurrencyCost, marginPct);
    } else {
      unitPrice = round4(quoteCurrencyCost);
      marginPct = 0;
    }

    const subtotal = round4(dto.qty * unitPrice);
    const effectiveCostAudit = getQuoteItemEffectiveCostAudit({
      qty: dto.qty,
      stock: dto.stock,
      externalProductCode: dto.externalProductCode,
      cost: dto.cost,
      costCurrency: dto.costCurrency,
      sellerQuotedUnitCost: dto.sellerQuotedUnitCost,
      sellerQuotedCurrency: dto.sellerQuotedCurrency,
      sellerQuotedExchangeRate: dto.sellerQuotedExchangeRate,
      unitPrice,
    }, quote.currency, quote.exchangeRate);
    const readinessInput = {
      productId: dto.productId,
      externalProductCode: dto.externalProductCode,
      ean: dto.ean,
      erpDescription: dto.erpDescription,
      customerDescription: dto.customerDescription,
      qty: dto.qty,
      unit: dto.unit,
      unitPrice,
      deliveryTime: dto.deliveryTime,
    };
    const requiresReview = !isQuoteItemReady(readinessInput);
    const customerDescriptionOriginal = dto.customerDescriptionOriginal ?? dto.customerDescription;
    const customerDescriptionWasEdited = Boolean(
      dto.customerDescriptionEditedAt
      && (customerDescriptionOriginal || "").trim() !== (dto.customerDescription || "").trim()
    );

    const updatedQuote = await this.quoteRepository.addItem({
      quoteId,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
      data: {
        productId: dto.productId,
        externalProductCode: dto.externalProductCode,
        ean: dto.ean,
        customerDescription: dto.customerDescription,
        customerDescriptionOriginal,
        customerDescriptionEditedAt: customerDescriptionWasEdited ? new Date() : null,
        customerDescriptionEditedByUserId: customerDescriptionWasEdited ? actor.id : null,
        customerUnit: dto.customerUnit,
        erpDescription: dto.erpDescription,
        unit: dto.unit,
        qty: dto.qty,
        stock: dto.stock,
        deliveryTime: dto.deliveryTime,
        itemComment: dto.itemComment,
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
        technicalFamily: dto.technicalFamily,
        technicalAttributes: dto.technicalAttributes,
        cost: round4(dto.cost),
        costCurrency: dto.costCurrency,
        erpSaleCurrency: dto.erpSaleCurrency,
        marginPct,
        effectiveCostAtQuote: round4(effectiveCostAudit.effectiveCostAtQuote),
        isBelowEffectiveCost: effectiveCostAudit.isBelowEffectiveCost,
        effectiveCostVariance: round4(effectiveCostAudit.effectiveCostVariance),
        effectiveCostVariancePct: round4(effectiveCostAudit.effectiveCostVariancePct),
        effectiveCostEvaluatedAt: new Date(),
        effectiveCostEvaluatedByUserId: actor.id,
        unitPrice,
        subtotal,
        sourceRequiresReview: dto.sourceRequiresReview,
        requiresReview,
        updatedByUserId: actor.id,
      },
    });

    if (!updatedQuote) throw new Error("Quote not found.");
    return new QuoteResponseDto(updatedQuote);
  }
}
