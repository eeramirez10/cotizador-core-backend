import type { UserRole } from "../../infrastructure/database/generated/enums";
import { GenerateOrderResponseDto } from "../dtos/response/generate-order-response.dto";
import { OrderGenerationRepository } from "../repositories/order-generation.repository";
import { QuoteRepository } from "../repositories/quote.repository";

interface GenerateQuoteOrderActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

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
    if (quote.status !== "APPROVED") {
      throw new Error("Quote must be APPROVED to generate order.");
    }
    if (quote.items.length === 0) {
      throw new Error("Quote must contain at least one item before generating order.");
    }
    if (quote.orderStatus === "GENERATED") {
      throw new Error("Order was already generated for this quote.");
    }

    const result = await this.orderGenerationRepository.generateOrderFromQuote(quote);

    const updatedQuote = await this.quoteRepository.markOrderGenerated({
      id: quote.id,
      actorUserId: actor.id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
      data: {
        orderReference: result.orderReference,
        fileName: result.fileName,
        generatedAt: result.generatedAt,
        note: `Order generated (${result.orderReference})`,
      },
    });

    if (!updatedQuote) throw new Error("Quote not found.");

    return new GenerateOrderResponseDto({
      quoteId: updatedQuote.id,
      quoteNumber: updatedQuote.quoteNumber,
      status: updatedQuote.status,
      orderReference: result.orderReference,
      generatedAt: result.generatedAt,
    });
  }
}
