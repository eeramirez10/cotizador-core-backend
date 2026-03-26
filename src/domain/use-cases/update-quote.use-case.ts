import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UpdateQuoteRequestDto } from "../dtos/request/update-quote-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";
import { QuoteRepository } from "../repositories/quote.repository";

interface UpdateQuoteActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const isLockedStatus = (status: string): boolean => status === "CANCELLED";

export class UpdateQuoteUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository
  ) {}

  async execute(id: string, dto: UpdateQuoteRequestDto, actor: UpdateQuoteActorContext): Promise<QuoteResponseDto> {
    const existing = await this.quoteRepository.findById({
      id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });
    if (!existing) throw new Error("Quote not found.");
    if (isLockedStatus(existing.status)) throw new Error("Quote cannot be edited in current status.");

    if (dto.customerId) {
      const customer = await this.customerRepository.findById({
        id: dto.customerId,
        scope: {
          role: actor.role,
          branchId: actor.branchId,
        },
      });
      if (!customer) throw new Error("Customer not found.");
    }

    const quote = await this.quoteRepository.updateById({
      id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
      data: {
        customerId: dto.customerId,
        origin: dto.origin,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate,
        exchangeRateDate: dto.exchangeRateDate,
        taxRate: dto.taxRate,
        deliveryPlace: dto.deliveryPlace,
        paymentTerms: dto.paymentTerms,
        validityDays: dto.validityDays,
        notes: dto.notes,
        updatedByUserId: actor.id,
      },
    });

    if (!quote) throw new Error("Quote not found.");
    return new QuoteResponseDto(quote);
  }
}
