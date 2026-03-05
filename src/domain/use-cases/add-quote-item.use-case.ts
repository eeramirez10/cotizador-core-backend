import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateQuoteItemRequestDto } from "../dtos/request/create-quote-item-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

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

const canEditItems = (status: string): boolean => status === "DRAFT" || status === "PENDING";

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
        branchId: actor.branchId,
      },
    });
    if (!quote) throw new Error("Quote not found.");
    if (!canEditItems(quote.status)) throw new Error("Quote items cannot be edited in current status.");

    let unitPrice: number;
    let marginPct: number;

    if (typeof dto.unitPrice === "number" && typeof dto.marginPct === "number") {
      unitPrice = round4(dto.unitPrice);
      marginPct = round4(dto.marginPct);
    } else if (typeof dto.unitPrice === "number") {
      unitPrice = round4(dto.unitPrice);
      marginPct = computeMarginPct(dto.cost, unitPrice);
    } else if (typeof dto.marginPct === "number") {
      marginPct = round4(dto.marginPct);
      unitPrice = computeUnitPrice(dto.cost, marginPct);
    } else {
      unitPrice = round4(dto.cost);
      marginPct = 0;
    }

    const subtotal = round4(dto.qty * unitPrice);

    const updatedQuote = await this.quoteRepository.addItem({
      quoteId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
      data: {
        productId: dto.productId,
        externalProductCode: dto.externalProductCode,
        ean: dto.ean,
        customerDescription: dto.customerDescription,
        customerUnit: dto.customerUnit,
        erpDescription: dto.erpDescription,
        unit: dto.unit,
        qty: dto.qty,
        stock: dto.stock,
        deliveryTime: dto.deliveryTime,
        cost: round4(dto.cost),
        costCurrency: dto.costCurrency,
        marginPct,
        unitPrice,
        subtotal,
        sourceRequiresReview: dto.sourceRequiresReview,
        requiresReview: dto.requiresReview,
        updatedByUserId: actor.id,
      },
    });

    if (!updatedQuote) throw new Error("Quote not found.");
    return new QuoteResponseDto(updatedQuote);
  }
}
