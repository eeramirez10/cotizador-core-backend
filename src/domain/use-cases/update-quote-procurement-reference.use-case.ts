import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UpdateQuoteProcurementReferenceRequestDto } from "../dtos/request/update-quote-procurement-reference-request.dto";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { PurchaseRequisitionRepository } from "../repositories/purchase-requisition.repository";
import { QuoteRepository } from "../repositories/quote.repository";

interface ActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class UpdateQuoteProcurementReferenceUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly purchaseRequisitionRepository: PurchaseRequisitionRepository,
  ) {}

  async execute(
    quoteId: string,
    itemId: string,
    dto: UpdateQuoteProcurementReferenceRequestDto,
    actor: ActorContext,
  ): Promise<QuoteResponseDto> {
    if (actor.role !== "SELLER") throw new Error("Only SELLER can update purchasing references.");
    const scope = { role: actor.role, userId: actor.id, branchId: actor.branchId };
    const quote = await this.quoteRepository.findById({ id: quoteId, scope });
    if (!quote) throw new Error("Quote not found.");
    if (quote.archivedAt) throw new Error("Archived quotes are read-only.");
    if (quote.captureMethod === "EXCEL_IMPORT") throw new Error("Excel-imported quotes do not generate purchasing references.");
    if (!["QUOTED", "APPROVED"].includes(quote.status)) {
      throw new Error("Purchasing references can only be updated on QUOTED or APPROVED quotes.");
    }
    if (quote.nextRevision && ["DRAFT", "PENDING", "PENDING_APPROVAL", "CHANGES_REQUESTED"].includes(quote.nextRevision.status)) {
      throw new Error("Purchasing references cannot change while a quote revision is in progress.");
    }

    const item = quote.items.find((entry) => entry.id === itemId || entry.clientItemId === itemId);
    if (!item) throw new Error("Quote item not found.");
    const erpCode = (item.externalProductCode || item.product?.code || "").trim();
    if (erpCode && Math.max(0, item.stock ?? 0) >= item.qty) {
      throw new Error("This quote item does not require purchasing.");
    }

    if (quote.status === "APPROVED") {
      const requisition = await this.purchaseRequisitionRepository.findByQuoteId(quote.id, actor);
      if (requisition && requisition.status !== "DRAFT") {
        throw new Error("Purchasing references are locked after the requisition is sent to Purchasing.");
      }
    }

    const updated = await this.quoteRepository.updateProcurementReference({
      quoteId: quote.id,
      itemId: item.id,
      scope,
      data: {
        sellerSupplierId: dto.sellerSupplierId,
        sellerSupplierNameSnapshot: dto.sellerSupplierName,
        sellerQuotedUnitCost: dto.sellerQuotedUnitCost,
        sellerCostSource: dto.sellerCostSource,
        sellerQuotedCurrency: dto.sellerQuotedCurrency,
        sellerQuotedExchangeRate: dto.sellerQuotedExchangeRate,
        sellerQuotedBrand: dto.sellerQuotedBrand,
        sellerSupplierDescription: dto.sellerSupplierDescription,
        sellerSupplierOrigin: dto.sellerSupplierOrigin,
        sellerSupplierQuoteValidUntil: dto.sellerSupplierQuoteValidUntil,
        sellerSupplierQuoteReference: dto.sellerSupplierQuoteReference,
        sellerSupplierQuoteNotes: dto.sellerSupplierQuoteNotes,
        sellerOriginRestrictions: dto.sellerOriginRestrictions,
        sellerDeliveryState: dto.sellerDeliveryState,
        sellerSupplierDeliveryTime: dto.sellerSupplierDeliveryTime,
        purchaseStandard: dto.purchaseStandard,
        purchaseDiameter: dto.purchaseDiameter,
        purchaseThickness: dto.purchaseThickness,
        purchaseBore: dto.purchaseBore,
        technicalFamily: dto.technicalFamily,
        technicalAttributes: dto.technicalAttributes,
        updatedByUserId: actor.id,
      },
    });
    if (!updated) throw new Error("Quote item not found.");

    if (updated.status === "APPROVED") {
      await this.purchaseRequisitionRepository.ensureForApprovedQuote(updated);
      const refreshed = await this.quoteRepository.findById({ id: updated.id, scope });
      return new QuoteResponseDto(refreshed ?? updated);
    }
    return new QuoteResponseDto(updated);
  }
}
