import type { UserRole } from "../../infrastructure/database/generated/enums";
import { MatchQuoteItemErpRequestDto } from "../dtos/request/match-quote-item-erp-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";
import { isQuoteItemReady } from "./quote-item-review.helper";

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
const canEditItems = (status: string): boolean => status !== "CANCELLED";

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
        branchId: actor.branchId,
      },
    });
    if (!quote) throw new Error("Quote not found.");
    if (!canEditItems(quote.status)) throw new Error("Quote items cannot be edited in current status.");

    const existingItem = quote.items.find((item) => item.id === itemId);
    if (!existingItem) throw new Error("Quote item not found.");

    const qty = typeof dto.qty === "number" ? dto.qty : existingItem.qty;
    const cost = round4(dto.cost);

    const hasUnitPrice = typeof dto.unitPrice === "number";
    const hasMarginPct = typeof dto.marginPct === "number";

    let unitPrice: number;
    let marginPct: number;

    if (hasUnitPrice && hasMarginPct) {
      unitPrice = round4(dto.unitPrice!);
      marginPct = round4(dto.marginPct!);
    } else if (hasUnitPrice) {
      unitPrice = round4(dto.unitPrice!);
      marginPct = computeMarginPct(cost, unitPrice);
    } else if (hasMarginPct) {
      marginPct = round4(dto.marginPct!);
      unitPrice = computeUnitPrice(cost, marginPct);
    } else {
      unitPrice = round4(existingItem.unitPrice > 0 ? existingItem.unitPrice : cost);
      marginPct = computeMarginPct(cost, unitPrice);
    }

    const subtotal = round4(qty * unitPrice);
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
        cost,
        costCurrency: dto.costCurrency,
        marginPct,
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
