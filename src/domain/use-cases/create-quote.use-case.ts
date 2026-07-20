import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateQuoteRequestDto } from "../dtos/request/create-quote-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { QuoteRepository } from "../repositories/quote.repository";
import { UserRepository } from "../repositories/user.repository";

interface CreateQuoteActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const buildQuoteNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(100000 + Math.random() * 900000);
  return `QT-${year}${month}${day}-${random}`;
};

export class CreateQuoteUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly branchRepository: BranchRepository,
    private readonly userRepository: UserRepository
  ) {}

  async execute(dto: CreateQuoteRequestDto, actor: CreateQuoteActorContext): Promise<QuoteResponseDto> {
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

    const providedByUser = dto.providedByUserId ? await this.userRepository.findActiveById(dto.providedByUserId) : null;
    if (dto.providedByUserId && !providedByUser) throw new Error("Provided by user not found or inactive.");

    const quote = await this.quoteRepository.createDraft({
      quoteNumber: buildQuoteNumber(),
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
      branchId,
      customerId: dto.customerId,
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
      providedByUserId: providedByUser?.id ?? null,
      providedByNameSnapshot: providedByUser ? `${providedByUser.firstName} ${providedByUser.lastName}`.trim() : null,
      providedByBranchNameSnapshot: providedByUser?.branch.name ?? null,
      providedAt: providedByUser ? new Date() : null,
      providedByAssignedByUserId: providedByUser ? actor.id : null,
      notes: dto.notes,
    });

    return new QuoteResponseDto(quote);
  }
}
