import type { QuoteStatus, UserRole } from "../../infrastructure/database/generated/enums";
import { ChangeQuoteStatusRequestDto } from "../dtos/request/change-quote-status-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

interface ChangeQuoteStatusActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const allowedTransitions: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["PENDING", "PENDING_APPROVAL", "CANCELLED"],
  PENDING: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["QUOTED", "CHANGES_REQUESTED", "CANCELLED"],
  CHANGES_REQUESTED: ["PENDING_APPROVAL", "CANCELLED"],
  QUOTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
  SUPERSEDED: [],
};

const isTransitionAllowed = (from: QuoteStatus, to: QuoteStatus): boolean => {
  return allowedTransitions[from].includes(to);
};

export class ChangeQuoteStatusUseCase {
  constructor(private readonly quoteRepository: QuoteRepository) {}

  async execute(
    quoteId: string,
    dto: ChangeQuoteStatusRequestDto,
    actor: ChangeQuoteStatusActorContext
  ): Promise<QuoteResponseDto> {
    const quote = await this.quoteRepository.findById({
      id: quoteId,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
    });
    if (!quote) throw new Error("Quote not found.");
    if (quote.archivedAt) throw new Error("Archived quotes are read-only.");

    const hasRevisionInProgress = Boolean(
      quote.nextRevision && ["DRAFT", "PENDING", "PENDING_APPROVAL", "CHANGES_REQUESTED"].includes(quote.nextRevision.status)
    );
    if (hasRevisionInProgress) {
      throw new Error("Quote status cannot change while a revision is in progress.");
    }

    if (quote.status === dto.status) throw new Error("Quote is already in the requested status.");
    if (!isTransitionAllowed(quote.status, dto.status)) {
      throw new Error(`Invalid status transition from ${quote.status} to ${dto.status}.`);
    }
    const isApprovalDecision = dto.status === "QUOTED" || dto.status === "CHANGES_REQUESTED";
    if (isApprovalDecision && !["ADMIN", "MANAGER"].includes(actor.role)) {
      throw new Error("Only ADMIN or MANAGER can approve or request changes to a quote.");
    }
    if (dto.status === "PENDING_APPROVAL" && actor.role !== "SELLER") {
      throw new Error("Only SELLER can submit a quote for approval.");
    }
    if (dto.status === "PENDING_APPROVAL" && quote.items.length === 0) {
      throw new Error("Quote must contain at least one item before moving to QUOTED.");
    }
    if (dto.status === "PENDING_APPROVAL" && quote.sourceChannel === "UNSPECIFIED") {
      throw new Error("Quote source channel is required before moving to QUOTED.");
    }
    if (dto.status === "CHANGES_REQUESTED" && !dto.approvalReturnReason) {
      throw new Error("Approval return reason is required before requesting changes.");
    }
    if (dto.status === "REJECTED" && !dto.rejectionReason) {
      throw new Error("Rejection reason is required before moving to REJECTED.");
    }
    if (dto.status === "REJECTED" && dto.rejectionReason === "OTHER" && !dto.rejectionComment) {
      throw new Error("Rejection comment is required when rejection reason is OTHER.");
    }
    if (dto.status === "CANCELLED" && !dto.cancellationReason) {
      throw new Error("Cancellation reason is required before moving to CANCELLED.");
    }
    if (dto.status === "CANCELLED" && dto.cancellationReason === "OTHER" && !dto.cancellationComment) {
      throw new Error("Cancellation comment is required when cancellation reason is OTHER.");
    }
    if (dto.status === "PENDING_APPROVAL") {
      const unlinkedItems = quote.items.filter(
        (item) => !item.productId && !item.externalProductCode
      );
      if (quote.captureMethod !== "EXCEL_IMPORT" && unlinkedItems.length > 0) {
        throw new Error("All quote items must be linked to an ERP or local product before moving to QUOTED.");
      }

      const reviewItems = quote.items.filter((item) => item.requiresReview);
      if (reviewItems.length > 0) {
        throw new Error("All quote items must be reviewed before moving to QUOTED.");
      }

      const itemsWithoutSellerPrice = quote.items.filter((item) => item.unitPrice <= 0);
      if (itemsWithoutSellerPrice.length > 0) {
        throw new Error("All quote items must have a seller price before moving to QUOTED.");
      }
    }

    const updatedQuote = await this.quoteRepository.changeStatus({
      id: quoteId,
      status: dto.status,
      note:
        dto.status === "REJECTED"
          ? `Rejected: ${dto.rejectionReason}.${dto.rejectionComment ? ` ${dto.rejectionComment}` : ""}`
          : dto.status === "CANCELLED"
            ? `Cancelled: ${dto.cancellationReason}.${dto.cancellationComment ? ` ${dto.cancellationComment}` : ""}`
            : dto.status === "CHANGES_REQUESTED"
              ? `Changes requested: ${dto.approvalReturnReason}.${dto.approvalReturnComment ? ` ${dto.approvalReturnComment}` : ""}`
              : dto.note,
      rejectionReason: dto.status === "REJECTED" ? dto.rejectionReason : null,
      rejectionComment: dto.status === "REJECTED" ? dto.rejectionComment : null,
      cancellationReason: dto.status === "CANCELLED" ? dto.cancellationReason : null,
      cancellationComment: dto.status === "CANCELLED" ? dto.cancellationComment : null,
      approvalReturnReason: dto.status === "CHANGES_REQUESTED" ? dto.approvalReturnReason : null,
      approvalReturnComment: dto.status === "CHANGES_REQUESTED" ? dto.approvalReturnComment : null,
      actorUserId: actor.id,
      scope: {
        role: actor.role,
        userId: actor.id,
        branchId: actor.branchId,
      },
    });

    if (!updatedQuote) throw new Error("Quote not found.");
    return new QuoteResponseDto(updatedQuote);
  }
}
