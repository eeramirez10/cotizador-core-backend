import type { UserRole } from "../../infrastructure/database/generated/enums";
import { prisma } from "../../infrastructure/database/prisma-client";
import { GenerateOrderResponseDto } from "../dtos/response/generate-order-response.dto";
import { OrderGenerationRepository } from "../repositories/order-generation.repository";
import { QuoteRepository } from "../repositories/quote.repository";
import { PurchaseRequisitionRepository } from "../repositories/purchase-requisition.repository";
import { evaluateQuoteOrderItems, isCustomerEligibleForOrderFile } from "./quote-order-eligibility";

interface GenerateQuoteOrderActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class GenerateQuoteOrderUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly orderGenerationRepository: OrderGenerationRepository,
    private readonly purchaseRequisitionRepository: PurchaseRequisitionRepository,
    private readonly allowOrderFileWithoutStock: () => boolean = () => false,
    private readonly allowOrderFileWithLocalCustomer: () => boolean = () => false,
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
    const customer = await prisma.customer.findUnique({
      where: { id: quote.customerId },
      select: { source: true, code: true },
    });
    if (!isCustomerEligibleForOrderFile(customer, this.allowOrderFileWithLocalCustomer())) {
      throw new Error("Customer must be linked to an ERP account before generating order.");
    }
    if (quote.nextRevision && ["DRAFT", "PENDING", "PENDING_APPROVAL", "CHANGES_REQUESTED"].includes(quote.nextRevision.status)) {
      throw new Error("Order cannot be generated while a quote revision is in progress.");
    }
    const eligibility = evaluateQuoteOrderItems(quote.items, this.allowOrderFileWithoutStock());
    if (eligibility.missingErpCode) {
      throw new Error("All quote items must have an ERP product code to generate order file.");
    }
    if (quote.items.some((item) => item.requiresReview)) {
      throw new Error("All quote items must be reviewed before generating order.");
    }
    const requisitionReady = eligibility.requiresPurchasing
      && await this.purchaseRequisitionRepository.isReadyForOrder(quote.id);
    if (eligibility.requiresReadyRequisition && !requisitionReady) {
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
    if (eligibility.requiresPurchasing && requisitionReady) {
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
