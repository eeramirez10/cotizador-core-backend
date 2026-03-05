import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateQuoteFromExtractionRequestDto } from "../dtos/request/create-quote-from-extraction-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { QuoteRepository } from "../repositories/quote.repository";

interface CreateQuoteFromExtractionActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const round4 = (value: number): number => Number(value.toFixed(4));
const buildQuoteNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(100000 + Math.random() * 900000);
  return `QT-${year}${month}${day}-${random}`;
};

export class CreateQuoteFromExtractionUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly branchRepository: BranchRepository
  ) {}

  async execute(
    dto: CreateQuoteFromExtractionRequestDto,
    actor: CreateQuoteFromExtractionActorContext
  ): Promise<QuoteResponseDto> {
    let branchId = actor.branchId;

    if (dto.branchCode) {
      if (actor.role !== "ADMIN") {
        throw new Error("branchCode is only allowed for ADMIN.");
      }

      const branch = await this.branchRepository.findActiveByCode(dto.branchCode);
      if (!branch) throw new Error("Branch not found.");
      branchId = branch.id;
    }

    const customer = await this.customerRepository.findById({
      id: dto.customerId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });
    if (!customer) throw new Error("Customer not found.");

    let quote = await this.quoteRepository.createDraft({
      quoteNumber: buildQuoteNumber(),
      origin: dto.origin,
      currency: dto.currency,
      exchangeRate: dto.exchangeRate,
      exchangeRateDate: dto.exchangeRateDate,
      taxRate: dto.taxRate,
      branchId,
      customerId: dto.customerId,
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
      notes: dto.notes,
    });

    for (const item of dto.items) {
      const qty = item.quantity ?? 1;
      const normalizedUnit = item.unitNormalized ?? item.unitOriginal ?? "N/A";
      const description =
        item.descriptionNormalized ?? item.descriptionOriginal ?? "Descripcion pendiente de revision";
      const inferredRequiresReview =
        item.requiresReview || item.quantity === null || !item.unitNormalized;

      const updatedQuote = await this.quoteRepository.addItem({
        quoteId: quote.id,
        scope: {
          role: actor.role,
          branchId: actor.branchId,
        },
        data: {
          productId: null,
          externalProductCode: null,
          ean: null,
          customerDescription: description,
          customerUnit: normalizedUnit !== "N/A" ? normalizedUnit : null,
          erpDescription: null,
          unit: normalizedUnit,
          qty: round4(qty),
          stock: null,
          deliveryTime: inferredRequiresReview ? "Requires review" : "To be defined",
          cost: 0,
          costCurrency: dto.currency,
          marginPct: 0,
          unitPrice: 0,
          subtotal: 0,
          sourceRequiresReview: inferredRequiresReview,
          requiresReview: inferredRequiresReview,
          updatedByUserId: actor.id,
        },
      });

      if (!updatedQuote) {
        throw new Error("Quote not found.");
      }

      quote = updatedQuote;
    }

    return new QuoteResponseDto(quote);
  }
}
