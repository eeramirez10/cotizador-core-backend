import { ChangeQuoteStatusRequestDto } from "../dtos/request/change-quote-status-request.dto";
import type { WhatsAppAssistantQuoteDetails } from "../entities/whatsapp-assistant.entity";
import type { WhatsAppAssistantRepository } from "../repositories/whatsapp-assistant.repository";
import type { ChangeQuoteStatusUseCase } from "./change-quote-status.use-case";

type ToolArguments = Record<string, unknown>;

export class ExecuteWhatsAppAssistantToolUseCase {
  constructor(
    private readonly repository: WhatsAppAssistantRepository,
    private readonly changeQuoteStatus: ChangeQuoteStatusUseCase,
    private readonly confirmationTtlMinutes = 15,
  ) {}

  async execute(conversationId: string, turnId: string, name: string, args: ToolArguments): Promise<unknown> {
    switch (name) {
      case "list_customer_quotes":
        return this.listQuotes(conversationId, args);
      case "get_quote_details":
        return this.getQuote(conversationId, args);
      case "list_rejection_reasons":
        return this.listRejectionReasons(conversationId, args);
      case "prepare_quote_acceptance":
        return this.prepareAcceptance(conversationId, turnId, args);
      case "confirm_quote_acceptance":
        return this.confirmAcceptance(conversationId, turnId, args);
      case "prepare_quote_rejection":
        return this.prepareRejection(conversationId, turnId, args);
      case "confirm_quote_rejection":
        return this.confirmRejection(conversationId, turnId, args);
      case "create_quote_change_request":
        return this.createChangeRequest(conversationId, args);
      case "contact_sales_representative":
        return this.contactSeller(conversationId, args);
      default:
        throw new Error(`Unsupported assistant tool: ${name}`);
    }
  }

  private async listQuotes(conversationId: string, args: ToolArguments) {
    const requested = this.number(args.limit) ?? 5;
    const quotes = await this.repository.listAuthorizedQuotes(conversationId, requested);
    return { quotes, count: quotes.length };
  }

  private async getQuote(conversationId: string, args: ToolArguments) {
    const quote = await this.requiredQuote(conversationId, args);
    return { quote: this.publicQuote(quote) };
  }

  private async listRejectionReasons(conversationId: string, args: ToolArguments) {
    const quoteNumber = this.requiredText(args.quoteNumber, "quoteNumber");
    const quote = await this.repository.findAuthorizedQuote(conversationId, quoteNumber);
    if (!quote) return { error: "QUOTE_NOT_FOUND_OR_NOT_AUTHORIZED" };
    return { reasons: await this.repository.listRejectionReasons(conversationId, quote.quoteNumber) };
  }

  private async prepareAcceptance(conversationId: string, turnId: string, args: ToolArguments) {
    const quote = await this.requiredQuote(conversationId, args);
    if (quote.status !== "QUOTED") {
      return { error: "QUOTE_NOT_ACCEPTABLE", currentStatus: quote.status };
    }
    const action = await this.repository.prepareAction({
      conversationId,
      preparedTurnId: turnId,
      quoteId: quote.id,
      actionType: "ACCEPT_QUOTE",
      payload: {},
      expiresAt: this.expiresAt(),
    });
    return { confirmationRequired: true, action: this.publicAction(action), quote: this.publicQuote(quote) };
  }

  private async confirmAcceptance(conversationId: string, turnId: string, args: ToolArguments) {
    const quote = await this.requiredQuote(conversationId, args);
    const action = await this.repository.findPendingAction({
      conversationId,
      currentTurnId: turnId,
      quoteId: quote.id,
      actionType: "ACCEPT_QUOTE",
      now: new Date(),
    });
    if (!action) return { error: "CONFIRMATION_NOT_FOUND_OR_EXPIRED" };
    if (quote.status === "APPROVED") {
      await this.repository.markActionExecuted(action.id, new Date());
      return { success: true, alreadyApplied: true, quoteNumber: quote.quoteNumber, status: "APPROVED" };
    }
    if (quote.status !== "QUOTED") return { error: "QUOTE_NOT_ACCEPTABLE", currentStatus: quote.status };

    await this.changeQuoteStatus.execute(
      quote.id,
      new ChangeQuoteStatusRequestDto({
        status: "APPROVED",
        note: "Cotización aceptada expresamente por el cliente mediante WhatsApp.",
        rejectionReason: null,
        rejectionComment: null,
        cancellationReason: null,
        cancellationComment: null,
        approvalReturnReason: null,
        approvalReturnComment: null,
      }),
      { id: quote.sellerId, role: "SELLER", branchId: quote.branchId, auditActorUserId: null },
    );
    await this.repository.markActionExecuted(action.id, new Date());
    return { success: true, quoteNumber: quote.quoteNumber, status: "APPROVED" };
  }

  private async prepareRejection(conversationId: string, turnId: string, args: ToolArguments) {
    const quote = await this.requiredQuote(conversationId, args);
    if (quote.status !== "QUOTED") return { error: "QUOTE_NOT_REJECTABLE", currentStatus: quote.status };
    const reasonCode = this.requiredText(args.reasonCode, "reasonCode").toUpperCase();
    const reasons = await this.repository.listRejectionReasons(conversationId, quote.quoteNumber);
    const reason = reasons.find((item) => item.code === reasonCode);
    if (!reason) return { error: "INVALID_REJECTION_REASON", availableReasons: reasons };
    const comment = this.optionalText(args.comment);
    if (reason.requiresComment && !comment) return { error: "REJECTION_COMMENT_REQUIRED", reason };
    const action = await this.repository.prepareAction({
      conversationId,
      preparedTurnId: turnId,
      quoteId: quote.id,
      actionType: "REJECT_QUOTE",
      payload: { reasonCode, reasonLabel: reason.label, comment },
      expiresAt: this.expiresAt(),
    });
    return { confirmationRequired: true, action: this.publicAction(action), quote: this.publicQuote(quote) };
  }

  private async confirmRejection(conversationId: string, turnId: string, args: ToolArguments) {
    const quote = await this.requiredQuote(conversationId, args);
    const action = await this.repository.findPendingAction({
      conversationId,
      currentTurnId: turnId,
      quoteId: quote.id,
      actionType: "REJECT_QUOTE",
      now: new Date(),
    });
    if (!action) return { error: "CONFIRMATION_NOT_FOUND_OR_EXPIRED" };
    if (quote.status === "REJECTED") {
      await this.repository.markActionExecuted(action.id, new Date());
      return { success: true, alreadyApplied: true, quoteNumber: quote.quoteNumber, status: "REJECTED" };
    }
    if (quote.status !== "QUOTED") return { error: "QUOTE_NOT_REJECTABLE", currentStatus: quote.status };
    const reasonCode = this.requiredText(action.payload.reasonCode, "pending reasonCode");
    const comment = this.optionalText(action.payload.comment);
    await this.changeQuoteStatus.execute(
      quote.id,
      new ChangeQuoteStatusRequestDto({
        status: "REJECTED",
        note: null,
        rejectionReason: reasonCode,
        rejectionComment: comment ? `${comment} (Confirmado por WhatsApp)` : "Confirmado por WhatsApp.",
        cancellationReason: null,
        cancellationComment: null,
        approvalReturnReason: null,
        approvalReturnComment: null,
      }),
      { id: quote.sellerId, role: "SELLER", branchId: quote.branchId, auditActorUserId: null },
    );
    await this.repository.markActionExecuted(action.id, new Date());
    return { success: true, quoteNumber: quote.quoteNumber, status: "REJECTED" };
  }

  private async createChangeRequest(conversationId: string, args: ToolArguments) {
    const quote = await this.requiredQuote(conversationId, args);
    if (!["QUOTED", "APPROVED"].includes(quote.status)) {
      return { error: "QUOTE_DOES_NOT_ACCEPT_CHANGE_REQUESTS", currentStatus: quote.status };
    }
    const requestedChanges = this.requiredText(args.requestedChanges, "requestedChanges");
    const requestedByPhone = await this.repository.getParticipantPhone(conversationId);
    if (!requestedByPhone) throw new Error("WHATSAPP_CONVERSATION_NOT_FOUND");
    const result = await this.repository.createChangeRequest({
      conversationId,
      quoteId: quote.id,
      customerContactId: quote.contactId,
      requestedByPhone,
      requestedChanges,
    });
    return { success: true, requestId: result.id, created: result.created, sellerName: quote.sellerName };
  }

  private async contactSeller(conversationId: string, args: ToolArguments) {
    const quote = await this.requiredQuote(conversationId, args);
    return { sellerName: quote.sellerName, quoteNumber: quote.quoteNumber, requestRegistered: false };
  }

  private async requiredQuote(conversationId: string, args: ToolArguments) {
    const quoteNumber = this.requiredText(args.quoteNumber, "quoteNumber");
    const quote = await this.repository.findAuthorizedQuote(conversationId, quoteNumber);
    if (!quote) throw new Error("QUOTE_NOT_FOUND_OR_NOT_AUTHORIZED");
    return quote;
  }

  private publicQuote(quote: WhatsAppAssistantQuoteDetails) {
    return {
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      currency: quote.currency,
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      validUntil: quote.validUntil,
      deliveryPlace: quote.deliveryPlace,
      paymentTerms: quote.paymentTerms,
      revisionNumber: quote.revisionNumber,
      orderStatus: quote.orderStatus,
      sellerName: quote.sellerName,
      itemDescriptions: quote.itemDescriptions,
    };
  }

  private publicAction(action: { quoteNumber: string; actionType: string; expiresAt: Date; payload: Record<string, unknown> }) {
    return {
      quoteNumber: action.quoteNumber,
      actionType: action.actionType,
      expiresAt: action.expiresAt,
      payload: action.payload,
    };
  }

  private expiresAt(): Date {
    return new Date(Date.now() + this.confirmationTtlMinutes * 60_000);
  }

  private requiredText(value: unknown, field: string): string {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) throw new Error(`${field} is required.`);
    return normalized;
  }

  private optionalText(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private number(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

}
