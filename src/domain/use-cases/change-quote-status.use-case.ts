import type { QuoteStatus, UserRole } from "../../infrastructure/database/generated/enums";
import { ChangeQuoteStatusRequestDto } from "../dtos/request/change-quote-status-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteCatalogRepository } from "../repositories/quote-catalog.repository";
import { QuoteRepository } from "../repositories/quote.repository";
import { QuoteCatalogType } from "../../infrastructure/database/generated/enums";
import { PurchaseRequisitionRepository } from "../repositories/purchase-requisition.repository";

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
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly quoteCatalogRepository: QuoteCatalogRepository,
    private readonly purchaseRequisitionRepository: PurchaseRequisitionRepository,
    private readonly internalApprovalEnabled = true
  ) {}

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

    const bypassInternalApproval = dto.status === "PENDING_APPROVAL" && !this.internalApprovalEnabled;
    const targetStatus: QuoteStatus = bypassInternalApproval ? "QUOTED" : dto.status;
    const canBypassFromCurrentStatus = ["DRAFT", "PENDING", "CHANGES_REQUESTED"].includes(quote.status);

    if (quote.status === targetStatus) {
      if (dto.status === "APPROVED") {
        if (quote.captureMethod !== "EXCEL_IMPORT") {
          await this.purchaseRequisitionRepository.ensureForApprovedQuote(quote);
        }
        return new QuoteResponseDto(quote);
      }
      throw new Error("Quote is already in the requested status.");
    }
    if ((bypassInternalApproval && !canBypassFromCurrentStatus) || (!bypassInternalApproval && !isTransitionAllowed(quote.status, targetStatus))) {
      throw new Error(`Invalid status transition from ${quote.status} to ${targetStatus}.`);
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
    if (dto.status === "PENDING_APPROVAL" && !quote.commercialConditions?.trim()) {
      throw new Error("Commercial conditions are required before moving to QUOTED.");
    }
    await this.validateCatalogReason(dto.status === "CHANGES_REQUESTED" ? "APPROVAL_RETURN_REASON" : null, dto.approvalReturnReason, dto.approvalReturnComment, actor.branchId, "Approval return reason is required before requesting changes.");
    await this.validateCatalogReason(dto.status === "REJECTED" ? "REJECTION_REASON" : null, dto.rejectionReason, dto.rejectionComment, actor.branchId, "Rejection reason is required before moving to REJECTED.");
    await this.validateCatalogReason(dto.status === "CANCELLED" ? "CANCELLATION_REASON" : null, dto.cancellationReason, dto.cancellationComment, actor.branchId, "Cancellation reason is required before moving to CANCELLED.");
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

      if (quote.captureMethod !== "EXCEL_IMPORT") {
        const incompleteProcurementItems = quote.items.filter((item) => {
          const hasErpCode = Boolean(item.externalProductCode?.trim());
          const isLocalProduct = !hasErpCode && Boolean(item.productId);
          const needsPurchase = isLocalProduct || (hasErpCode && Math.max(0, item.stock ?? 0) < item.qty);
          if (!needsPurchase) return false;
          return !item.sellerSupplierNameSnapshot?.trim()
            || item.sellerQuotedUnitCost === null
            || item.sellerQuotedUnitCost <= 0
            || !item.sellerQuotedCurrency
            || !item.sellerDeliveryState?.trim()
            || !item.sellerSupplierDeliveryTime?.trim();
        });
        if (incompleteProcurementItems.length > 0) {
          throw new Error("Complete supplier, quoted cost, delivery state and supplier delivery time for every local or out-of-stock item.");
        }
      }
    }

    const updatedQuote = await this.quoteRepository.changeStatus({
      id: quoteId,
      status: targetStatus,
      note:
        bypassInternalApproval
          ? "Quote generated. Internal approval bypassed by system configuration."
          : dto.status === "REJECTED"
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
    if (updatedQuote.status === "APPROVED" && updatedQuote.captureMethod !== "EXCEL_IMPORT") {
      await this.purchaseRequisitionRepository.ensureForApprovedQuote(updatedQuote);
    }
    return new QuoteResponseDto(updatedQuote);
  }

  private async validateCatalogReason(
    type: QuoteCatalogType | null,
    code: string | null,
    comment: string | null,
    branchId: string,
    requiredMessage: string
  ): Promise<void> {
    if (!type) return;
    if (!code) throw new Error(requiredMessage);
    const option = await this.quoteCatalogRepository.findActiveByCode(branchId, type, code);
    if (!option) throw new Error("Selected reason is not available for this branch.");
    if (option.requiresComment && !comment) throw new Error("A comment is required for the selected reason.");
  }
}
