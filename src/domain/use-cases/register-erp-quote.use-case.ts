import type { UserRole } from "../../infrastructure/database/generated/enums";
import { RegisterErpQuoteRequestDto } from "../dtos/request/register-erp-quote-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { ErpQuoteLookupPort } from "../contracts/erp-quote-lookup.port";

interface Actor {
  id: string;
  role: UserRole;
  branchId: string;
}

export class RegisterErpQuoteUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly erpQuoteLookup: ErpQuoteLookupPort,
  ) {}

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
      throw new Error("Only Excel-imported quotes can be registered as ERP quotes.");
    }
    if (current.status !== "APPROVED") {
      throw new Error("Quote must be APPROVED before registering it in ERP.");
    }
    if (current.erpQuoteNumber === dto.erpQuoteNumber) return new QuoteResponseDto(current);

    const erpQuote = await this.erpQuoteLookup.findByNumber(dto.erpQuoteNumber);
    if (!erpQuote) throw new Error("ERP quote number does not exist in Proscai.");
    const customer = await this.customerRepository.findById({ id: current.customerId, scope });
    if (!customer) throw new Error("Quote customer not found.");
    if (customer.code && erpQuote.customerCode !== customer.code.trim().toUpperCase()) {
      throw new Error("ERP quote belongs to a different customer.");
    }

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
