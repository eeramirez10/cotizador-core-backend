import type { UserRole } from "../../infrastructure/database/generated/enums";
import type { WhatsAppCustomerChangeRequestEntity } from "../entities/whatsapp-assistant.entity";
import type { QuoteRepository } from "../repositories/quote.repository";
import type { WhatsAppAssistantRepository } from "../repositories/whatsapp-assistant.repository";

interface ActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class GetQuoteCustomerChangeRequestsUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly assistantRepository: WhatsAppAssistantRepository,
  ) {}

  async execute(quoteId: string, actor: ActorContext): Promise<WhatsAppCustomerChangeRequestEntity[]> {
    const quote = await this.quoteRepository.findById({
      id: quoteId,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
    });
    if (!quote) throw new Error("Quote not found.");
    return this.assistantRepository.listChangeRequests(quoteId);
  }
}
