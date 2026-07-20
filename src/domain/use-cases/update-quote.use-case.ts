import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UpdateQuoteRequestDto } from "../dtos/request/update-quote-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";
import { QuoteRepository } from "../repositories/quote.repository";
import { UserRepository } from "../repositories/user.repository";

interface UpdateQuoteActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const isEditableStatus = (status: string): boolean => ["DRAFT", "PENDING", "CHANGES_REQUESTED"].includes(status);

export class UpdateQuoteUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(id: string, dto: UpdateQuoteRequestDto, actor: UpdateQuoteActorContext): Promise<QuoteResponseDto> {
    const existing = await this.quoteRepository.findById({
      id,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
    });
    if (!existing) throw new Error("Quote not found.");
    if (!isEditableStatus(existing.status)) throw new Error("Quote cannot be edited in current status.");
    const nextCaptureMethod = dto.captureMethod ?? existing.captureMethod;
    const nextOriginalQuoteDate =
      typeof dto.originalQuoteDate === "undefined"
        ? existing.originalQuoteDate
        : dto.originalQuoteDate;
    if (nextCaptureMethod === "EXCEL_IMPORT" && !nextOriginalQuoteDate) {
      throw new Error("Original quote date is required for EXCEL_IMPORT.");
    }

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

    const providerWasUpdated = typeof dto.providedByUserId !== "undefined";
    const providedByUser = dto.providedByUserId ? await this.userRepository.findActiveById(dto.providedByUserId) : null;
    if (dto.providedByUserId && !providedByUser) throw new Error("Provided by user not found or inactive.");
    const providerChanged = providerWasUpdated && existing.providedByUserId !== (providedByUser?.id ?? null);

    const quote = await this.quoteRepository.updateById({
      id,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
      data: {
        customerId: dto.customerId,
        origin: dto.origin,
        captureMethod: dto.captureMethod,
        originalQuoteDate: dto.originalQuoteDate,
        sourceChannel: dto.sourceChannel,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate,
        exchangeRateDate: dto.exchangeRateDate,
        taxRate: dto.taxRate,
        deliveryPlace: dto.deliveryPlace,
        paymentTerms: dto.paymentTerms,
        validityDays: dto.validityDays,
        notes: dto.notes,
        ...(providerWasUpdated
          ? {
              providedByUserId: providedByUser?.id ?? null,
              providedByNameSnapshot: providedByUser ? `${providedByUser.firstName} ${providedByUser.lastName}`.trim() : null,
              providedByBranchNameSnapshot: providedByUser?.branch.name ?? null,
              providedAt: providedByUser ? new Date() : null,
              providedByAssignedByUserId: providedByUser ? actor.id : null,
              providerAttributionEventNote: providerChanged
                ? providedByUser
                  ? `Provided by assigned to ${providedByUser.firstName} ${providedByUser.lastName}.`
                  : "Provided by attribution removed."
                : undefined,
            }
          : {}),
        updatedByUserId: actor.id,
      },
    });

    if (!quote) throw new Error("Quote not found.");
    return new QuoteResponseDto(quote);
  }
}
