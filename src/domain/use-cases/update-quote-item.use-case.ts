import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UpdateQuoteItemRequestDto } from "../dtos/request/update-quote-item-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

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
const canEditItems = (status: string): boolean => status === "DRAFT" || status === "PENDING";

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
        branchId: actor.branchId,
      },
    });
    if (!quote) throw new Error("Quote not found.");
    if (!canEditItems(quote.status)) throw new Error("Quote items cannot be edited in current status.");

    const existingItem = quote.items.find((item) => item.id === itemId);
    if (!existingItem) throw new Error("Quote item not found.");

    const qty = typeof dto.qty === "number" ? dto.qty : existingItem.qty;
    const cost = typeof dto.cost === "number" ? dto.cost : existingItem.cost;

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
      unitPrice = round4(existingItem.unitPrice);
      marginPct = typeof dto.cost === "number" ? computeMarginPct(cost, unitPrice) : round4(existingItem.marginPct);
    }

    const subtotal = round4(qty * unitPrice);

    const updatedQuote = await this.quoteRepository.updateItem({
      quoteId,
      itemId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
      data: {
        productId: dto.productId !== undefined ? dto.productId : existingItem.productId,
        externalProductCode:
          dto.externalProductCode !== undefined
            ? dto.externalProductCode
            : existingItem.externalProductCode,
        ean: dto.ean !== undefined ? dto.ean : existingItem.ean,
        customerDescription:
          dto.customerDescription !== undefined ? dto.customerDescription : existingItem.customerDescription,
        customerUnit: dto.customerUnit !== undefined ? dto.customerUnit : existingItem.customerUnit,
        erpDescription: dto.erpDescription !== undefined ? dto.erpDescription : existingItem.erpDescription,
        unit: dto.unit !== undefined ? dto.unit : existingItem.unit,
        qty,
        stock: dto.stock !== undefined ? dto.stock : existingItem.stock,
        deliveryTime: dto.deliveryTime !== undefined ? dto.deliveryTime : existingItem.deliveryTime,
        cost: round4(cost),
        costCurrency: dto.costCurrency !== undefined ? dto.costCurrency : existingItem.costCurrency,
        marginPct,
        unitPrice,
        subtotal,
        sourceRequiresReview:
          dto.sourceRequiresReview !== undefined ? dto.sourceRequiresReview : existingItem.sourceRequiresReview,
        requiresReview: dto.requiresReview !== undefined ? dto.requiresReview : existingItem.requiresReview,
        updatedByUserId: actor.id,
      },
    });

    if (!updatedQuote) throw new Error("Quote item not found.");
    return new QuoteResponseDto(updatedQuote);
  }
}
