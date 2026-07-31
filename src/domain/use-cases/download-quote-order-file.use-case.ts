import type { UserRole } from "../../infrastructure/database/generated/enums";
import { GeneratedOrderFileResult } from "../datasources/order-generation.datasource";
import { OrderGenerationRepository } from "../repositories/order-generation.repository";
import { QuoteRepository } from "../repositories/quote.repository";

interface DownloadQuoteOrderFileActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class DownloadQuoteOrderFileUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly orderGenerationRepository: OrderGenerationRepository
  ) {}

  async execute(quoteId: string, actor: DownloadQuoteOrderFileActorContext): Promise<GeneratedOrderFileResult> {
    const quote = await this.quoteRepository.findById({
      id: quoteId,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
    });

    if (!quote) throw new Error("Quote not found.");
    if (quote.captureMethod === "EXCEL_IMPORT") {
      throw new Error("Order files are not available for Excel-imported quotes.");
    }
    if (quote.orderStatus !== "GENERATED" || !quote.orderReference) {
      throw new Error("Order file is not available for this quote.");
    }

    let orderFile = await this.orderGenerationRepository.getOrderFileByFileName(`${quote.quoteNumber}.txt`);
    if (!orderFile && quote.orderReference) {
      // Backward compatibility for files generated before naming change.
      orderFile = await this.orderGenerationRepository.getOrderFileByFileName(`${quote.orderReference}.txt`);
    }
    if (!orderFile) {
      throw new Error("Order file not found in outbox.");
    }

    return orderFile;
  }
}
