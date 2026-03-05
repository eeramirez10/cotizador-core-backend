import type { QuoteStatus, UserRole } from "../../infrastructure/database/generated/enums";
import { GenerateOrderResponseDto } from "../dtos/response/generate-order-response.dto";
import { OrderGenerationRepository } from "../repositories/order-generation.repository";
import { QuoteRepository } from "../repositories/quote.repository";

interface GenerateQuoteOrderActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const allowedStatuses: QuoteStatus[] = ["QUOTED", "APPROVED"];

export class GenerateQuoteOrderUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly orderGenerationRepository: OrderGenerationRepository
  ) {}

  async execute(quoteId: string, actor: GenerateQuoteOrderActorContext): Promise<GenerateOrderResponseDto> {
    const quote = await this.quoteRepository.findById({
      id: quoteId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!quote) throw new Error("Quote not found.");
    if (!allowedStatuses.includes(quote.status)) {
      throw new Error("Quote must be QUOTED or APPROVED to generate order.");
    }
    if (quote.items.length === 0) {
      throw new Error("Quote must contain at least one item before generating order.");
    }

    const result = await this.orderGenerationRepository.generateOrderFromQuote(quote);

    // Track generation action in quote_events without changing business status.
    await this.quoteRepository.changeStatus({
      id: quote.id,
      status: quote.status,
      note: `Order generated (${result.orderReference})`,
      actorUserId: actor.id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    return new GenerateOrderResponseDto({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      orderReference: result.orderReference,
      generatedAt: result.generatedAt,
    });
  }
}
