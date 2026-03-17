import type { UserRole } from "../../infrastructure/database/generated/enums";
import { RegisterQuoteDeliveryAttemptRequestDto } from "../dtos/request/register-quote-delivery-attempt-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

interface RegisterQuoteDeliveryAttemptActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const channelLabel: Record<"WHATSAPP" | "EMAIL", string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

export class RegisterQuoteDeliveryAttemptUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(
    quoteId: string,
    dto: RegisterQuoteDeliveryAttemptRequestDto,
    actor: RegisterQuoteDeliveryAttemptActorContext
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteRepository.findById({
      id: quoteId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!quote) throw new Error("Quote not found.");

    if (quote.status === "DRAFT" || quote.status === "PENDING" || quote.status === "CANCELLED") {
      throw new Error("Quote must be QUOTED, APPROVED or REJECTED to register delivery attempts.");
    }

    const statusNote =
      dto.status === "SENT"
        ? `Quote sent via ${channelLabel[dto.channel]} to ${dto.recipient}.`
        : `Quote delivery failed via ${channelLabel[dto.channel]} to ${dto.recipient}.`;

    const updatedQuote = await this.quoteRepository.recordDeliveryAttempt({
      id: quoteId,
      actorUserId: actor.id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
      data: {
        channel: dto.channel,
        recipient: dto.recipient,
        status: dto.status,
        providerMessageId: dto.providerMessageId,
        errorMessage: dto.errorMessage,
        note: dto.note ?? statusNote,
        sentAt: new Date(),
      },
    });

    if (!updatedQuote) throw new Error("Quote not found.");

    return new QuoteResponseDto(updatedQuote);
  }
}
