import type { UserRole } from "../../infrastructure/database/generated/enums";
import { GenerateOrderResponseDto } from "../dtos/response/generate-order-response.dto";
import { OrderGenerationRepository } from "../repositories/order-generation.repository";
import { QuoteRepository } from "../repositories/quote.repository";
import { PurchaseRequisitionRepository } from "../repositories/purchase-requisition.repository";

interface GenerateQuoteOrderActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class GenerateQuoteOrderUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly orderGenerationRepository: OrderGenerationRepository,
    private readonly purchaseRequisitionRepository: PurchaseRequisitionRepository
  ) {}

  async execute(quoteId: string, actor: GenerateQuoteOrderActorContext): Promise<GenerateOrderResponseDto> {
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
    if (quote.captureMethod === "EXCEL_IMPORT") {
      throw new Error("Orders cannot be generated from Excel-imported quotes.");
    }
    if (quote.status !== "APPROVED") {
      throw new Error("Quote must be APPROVED to generate order.");
    }
    if (quote.items.length === 0) {
      throw new Error("Quote must contain at least one item before generating order.");
    }
    if (quote.orderStatus === "GENERATED") {
      throw new Error("Order was already generated for this quote.");
    }
    if (quote.nextRevision && ["DRAFT", "PENDING", "PENDING_APPROVAL", "CHANGES_REQUESTED"].includes(quote.nextRevision.status)) {
      throw new Error("Order cannot be generated while a quote revision is in progress.");
    }
    const unlinkedItems = quote.items.filter(
      (item) => !item.productId && !item.externalProductCode && !item.ean
    );
    if (unlinkedItems.length > 0) {
      throw new Error("All quote items must be linked to an ERP or local product before generating order.");
    }
    if (quote.items.some((item) => item.requiresReview)) {
      throw new Error("All quote items must be reviewed before generating order.");
    }
    const requiresPurchasing = quote.items.some((item) => {
      const erpCode = (item.externalProductCode || item.product?.code || "").trim();
      const availableStock = Math.max(0, item.stock ?? 0);
      return !erpCode || availableStock < item.qty;
    });
    if (requiresPurchasing && !(await this.purchaseRequisitionRepository.isReadyForOrder(quote.id))) {
      throw new Error("Purchase requisition must be READY_FOR_ORDER before generating order.");
    }

    const result = await this.orderGenerationRepository.generateOrderFromQuote(quote);

    const updatedQuote = await this.quoteRepository.markOrderGenerated({
      id: quote.id,
      actorUserId: actor.id,
      scope: {
        role: actor.role,
        userId: actor.id,
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
    if (requiresPurchasing) {
      await this.purchaseRequisitionRepository.markCompletedByQuoteId(quote.id);
    }

    return new GenerateOrderResponseDto({
      quoteId: updatedQuote.id,
      quoteNumber: updatedQuote.quoteNumber,
      status: updatedQuote.status,
      orderReference: result.orderReference,
      generatedAt: result.generatedAt,
    });
  }
}
