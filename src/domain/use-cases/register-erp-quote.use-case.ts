import type { UserRole } from "../../infrastructure/database/generated/enums";
import { RegisterErpQuoteRequestDto } from "../dtos/request/register-erp-quote-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

interface Actor {
  id: string;
  role: UserRole;
  branchId: string;
}

export class RegisterErpQuoteUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(
    quoteId: string,
    dto: RegisterErpQuoteRequestDto,
    actor: Actor
  ): Promise<QuoteResponseDto> {
    const scope = { role: actor.role, userId: actor.id, branchId: actor.branchId };
    const current = await this.quoteRepository.findById({ id: quoteId, scope });

    if (!current) throw new Error("Quote not found.");
    if (current.archivedAt) throw new Error("Archived quotes are read-only.");
    if (current.captureMethod !== "EXCEL_IMPORT") {
      throw new Error("Only Excel-imported quotes can be registered in ERP.");
    }
    if (current.status !== "APPROVED") {
      throw new Error("Quote must be APPROVED before registering it in ERP.");
    }
    if (current.erpQuoteNumber === dto.erpQuoteNumber) return new QuoteResponseDto(current);

    const updated = await this.quoteRepository.registerErpQuote({
      id: quoteId,
      actorUserId: actor.id,
      erpQuoteNumber: dto.erpQuoteNumber,
      scope,
    });
    if (!updated) throw new Error("Quote not found.");

    return new QuoteResponseDto(updated);
  }
}
