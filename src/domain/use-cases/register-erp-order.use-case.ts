import type { UserRole } from "../../infrastructure/database/generated/enums";
import { RegisterErpOrderRequestDto } from "../dtos/request/register-erp-order-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { ErpOrderLookupPort } from "../contracts/erp-order-lookup.port";
import { CustomerRepository } from "../repositories/customer.repository";
import { QuoteRepository } from "../repositories/quote.repository";

const orderPrefixByBranchCode: Record<string, string> = {
  "01": "P",
  "02": "PB",
  "03": "PE",
  "04": "PD",
  "05": "PF",
  "06": "PG",
  "07": "PH",
};

interface Actor { id: string; role: UserRole; branchId: string }

export class RegisterErpOrderUseCase {
  constructor(
    private readonly quotes: QuoteRepository,
    private readonly customers: CustomerRepository,
    private readonly erpOrders: ErpOrderLookupPort,
  ) {}

  async execute(quoteId: string, dto: RegisterErpOrderRequestDto, actor: Actor): Promise<QuoteResponseDto> {
    const scope = { role: actor.role, userId: actor.id, branchId: actor.branchId };
    const quote = await this.quotes.findById({ id: quoteId, scope });
    if (!quote) throw new Error("Quote not found.");
    if (quote.archivedAt) throw new Error("Archived quotes are read-only.");
    if (quote.captureMethod !== "SYSTEM") throw new Error("Only system quotes can be linked to ERP orders.");
    if (quote.status !== "APPROVED") throw new Error("Quote must be APPROVED before linking an ERP order.");
    if (quote.orderStatus !== "GENERATED") throw new Error("Order TXT must be generated before linking an ERP order.");
    if (quote.erpOrderNumber === dto.erpOrderNumber) return new QuoteResponseDto(quote);

    const prefix = orderPrefixByBranchCode[quote.branch.code];
    if (!prefix) throw new Error("Quote branch has no configured ERP order prefix.");
    const sequence = dto.erpOrderNumber.slice(prefix.length);
    if (!dto.erpOrderNumber.startsWith(prefix) || !/^\d+$/.test(sequence)) {
      throw new Error(`ERP order number must start with ${prefix} followed by digits for this branch.`);
    }

    const erpOrder = await this.erpOrders.findByNumber(dto.erpOrderNumber);
    if (!erpOrder) throw new Error("ERP order number does not exist in Proscai.");
    const customer = await this.customers.findById({ id: quote.customerId, scope });
    if (!customer) throw new Error("Quote customer not found.");
    if (customer.code && erpOrder.customerCode !== customer.code.trim().toUpperCase()) {
      throw new Error("ERP order belongs to a different customer.");
    }

    const updated = await this.quotes.registerErpOrder({
      id: quoteId,
      actorUserId: actor.id,
      erpOrderNumber: dto.erpOrderNumber,
      scope,
    });
    if (!updated) throw new Error("Quote not found.");
    return new QuoteResponseDto(updated);
  }
}
