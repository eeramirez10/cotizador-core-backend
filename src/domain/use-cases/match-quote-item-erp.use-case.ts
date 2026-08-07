import type { UserRole } from "../../infrastructure/database/generated/enums";
import { MatchQuoteItemErpRequestDto } from "../dtos/request/match-quote-item-erp-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";
import { isQuoteItemReady } from "./quote-item-review.helper";
import { getQuoteItemEffectiveCostAudit, getQuoteItemEffectiveUnitCost } from "./quote-item-fulfillment.helper";

interface MatchQuoteItemErpActorContext {
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

export class MatchQuoteItemErpUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(
    quoteId: string,
    itemId: string,
    dto: MatchQuoteItemErpRequestDto,
    actor: MatchQuoteItemErpActorContext
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
      throw new Error("ERP matching is not available for Excel-imported quotes.");
    }
    if (!canEditItems(quote.status)) throw new Error("Quote items cannot be edited in current status.");

    const existingItem = quote.items.find((item) => item.id === itemId);
    if (!existingItem) throw new Error("Quote item not found.");

    const qty = typeof dto.qty === "number" ? dto.qty : existingItem.qty;
    const cost = round4(dto.cost);
    const effectiveCostInput = {
      qty,
      stock: dto.stock,
      externalProductCode: dto.externalProductCode,
      cost,
      costCurrency: dto.costCurrency,
      sellerQuotedUnitCost: existingItem.sellerQuotedUnitCost,
      sellerQuotedCurrency: existingItem.sellerQuotedCurrency,
      sellerQuotedExchangeRate: existingItem.sellerQuotedExchangeRate,
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
      unitPrice = round4(existingItem.unitPrice > 0 ? existingItem.unitPrice : quoteCurrencyCost);
      marginPct = computeMarginPct(quoteCurrencyCost, unitPrice);
    }

    const subtotal = round4(qty * unitPrice);
    const effectiveCostAudit = getQuoteItemEffectiveCostAudit(
      { ...effectiveCostInput, unitPrice },
      quote.currency,
      quote.exchangeRate
    );
    const requiresReview = !isQuoteItemReady({
      productId: dto.productId ?? existingItem.productId,
      externalProductCode: dto.externalProductCode,
      ean: dto.ean ?? existingItem.ean,
      erpDescription: dto.erpDescription,
      qty,
      unit: dto.unit,
    });

    const updatedQuote = await this.quoteRepository.updateItem({
      quoteId,
      itemId,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
      data: {
        productId: dto.productId,
        externalProductCode: dto.externalProductCode,
        ean: dto.ean,
        erpDescription: dto.erpDescription,
        unit: dto.unit,
        qty,
        stock: dto.stock,
        deliveryTime: dto.deliveryTime ?? existingItem.deliveryTime,
        itemComment: dto.itemComment !== undefined ? dto.itemComment : existingItem.itemComment,
        cost,
        costCurrency: dto.costCurrency,
        marginPct,
        effectiveCostAtQuote: round4(effectiveCostAudit.effectiveCostAtQuote),
        isBelowEffectiveCost: effectiveCostAudit.isBelowEffectiveCost,
        effectiveCostVariance: round4(effectiveCostAudit.effectiveCostVariance),
        effectiveCostVariancePct: round4(effectiveCostAudit.effectiveCostVariancePct),
        effectiveCostEvaluatedAt: new Date(),
        effectiveCostEvaluatedByUserId: actor.id,
        unitPrice,
        subtotal,
        sourceRequiresReview: existingItem.sourceRequiresReview,
        requiresReview,
        updatedByUserId: actor.id,
      },
    });

    if (!updatedQuote) throw new Error("Quote item not found.");
    return new QuoteResponseDto(updatedQuote);
  }
}
