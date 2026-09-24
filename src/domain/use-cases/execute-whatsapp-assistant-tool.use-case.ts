import { ChangeQuoteStatusRequestDto } from "../dtos/request/change-quote-status-request.dto";
import type { WhatsAppAssistantQuoteDetails } from "../entities/whatsapp-assistant.entity";
import type { WhatsAppAssistantRepository } from "../repositories/whatsapp-assistant.repository";
import type { ChangeQuoteStatusUseCase } from "./change-quote-status.use-case";
import type { WhatsAppInternalAssistantUseCase } from "./whatsapp-internal-assistant.use-case";
import type { WhatsAppLeadAssistantUseCase } from "./whatsapp-lead-assistant.use-case";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import type { SendWhatsAppInternalAlertUseCase } from "./send-whatsapp-internal-alert.use-case";
import type { CustomerOnboardingUseCase, CustomerOnboardingWriteInput } from "./customer-onboarding.use-case";

type ToolArguments = Record<string, unknown>;

export class ExecuteWhatsAppAssistantToolUseCase {
  constructor(
    private readonly repository: WhatsAppAssistantRepository,
    private readonly changeQuoteStatus: ChangeQuoteStatusUseCase,
    private readonly confirmationTtlMinutes = 15,
    private readonly internalAssistant?: WhatsAppInternalAssistantUseCase,
    private readonly leadAssistant?: WhatsAppLeadAssistantUseCase,
    private readonly realtime?: WhatsAppRealtimePublisher,
    private readonly internalAlerts?: SendWhatsAppInternalAlertUseCase,
    private readonly customerOnboarding?: CustomerOnboardingUseCase,
  ) {}

  async execute(conversationId: string, turnId: string, name: string, args: ToolArguments): Promise<unknown> {
    const principal = await this.repository.getPrincipal(conversationId);
    if (principal.sharedCustomerPhone && ([
      "get_whatsapp_lead", "update_whatsapp_lead", "upsert_whatsapp_quote_request", "close_whatsapp_quote_request",
      "list_customer_quotes", "get_customer_onboarding", "update_customer_onboarding", "process_customer_tax_document",
    ].includes(name))) {
      return { error: "QUOTE_NUMBER_REQUIRED_FOR_SHARED_PHONE" };
    }
    if ([
      "get_whatsapp_lead",
      "update_whatsapp_lead",
      "upsert_whatsapp_quote_request",
      "close_whatsapp_quote_request",
    ].includes(name)) {
      if (!this.leadAssistant) throw new Error("WHATSAPP_LEAD_ASSISTANT_NOT_CONFIGURED");
      return this.leadAssistant.execute(principal, conversationId, name, args);
    }
    if (name.startsWith("request_internal_") || name.startsWith("verify_internal_") || name.startsWith("get_internal_") || name.startsWith("list_internal_")) {
      if (!this.internalAssistant) throw new Error("INTERNAL_ASSISTANT_NOT_CONFIGURED");
      return this.internalAssistant.execute(principal, name, args);
    }
    if (principal.audience !== "CUSTOMER") throw new Error("CUSTOMER_ASSISTANT_NOT_AUTHORIZED");
    if (["get_customer_onboarding", "update_customer_onboarding", "process_customer_tax_document"].includes(name)
      && principal.customerSource !== "LOCAL") throw new Error("CUSTOMER_ONBOARDING_LOCAL_ONLY");

    switch (name) {
      case "list_customer_quotes":
        return this.listQuotes(conversationId, args);
      case "get_quote_details":
        return this.getQuote(conversationId, args);
      case "search_quote_items":
        return this.searchQuoteItems(conversationId, args);
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
      case "create_quote_information_request":
        return this.createInformationRequest(conversationId, args);
      case "contact_sales_representative":
        return this.contactSeller(conversationId, args);
      case "get_customer_onboarding":
        return this.customerOnboarding?.getForConversation(conversationId) ?? { error: "CUSTOMER_ONBOARDING_NOT_CONFIGURED" };
      case "update_customer_onboarding":
        return this.customerOnboarding?.updateFromAssistant(conversationId, this.onboardingInput(args)) ?? { error: "CUSTOMER_ONBOARDING_NOT_CONFIGURED" };
      case "process_customer_tax_document":
        return { error: "TAX_DOCUMENT_REQUIRES_SELLER_REVIEW" };
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
    const quote = await this.requiredCurrentQuote(conversationId, args);
    return { quote: this.publicQuote(quote) };
  }

  private async searchQuoteItems(conversationId: string, args: ToolArguments) {
    const quote = await this.requiredCurrentQuote(conversationId, args);
    const query = this.optionalText(args.query);
    const position = this.positiveInteger(args.position);
    if (!query && position === null) return { error: "ITEM_QUERY_OR_POSITION_REQUIRED" };
    const result = await this.repository.searchAuthorizedQuoteItems({
      conversationId,
      quoteNumber: quote.quoteNumber,
      query,
      position,
      limit: 5,
    });
    return result || { error: "QUOTE_NOT_FOUND_OR_NOT_AUTHORIZED" };
  }

  private async listRejectionReasons(conversationId: string, args: ToolArguments) {
    const quote = await this.requiredCurrentQuote(conversationId, args);
    return { reasons: await this.repository.listRejectionReasons(conversationId, quote.quoteNumber) };
  }

  private async prepareAcceptance(conversationId: string, turnId: string, args: ToolArguments) {
    const quote = await this.requiredCurrentQuote(conversationId, args);
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
    const quote = await this.requiredCurrentQuote(conversationId, args);
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
      const onboarding = await this.customerOnboarding?.ensureAfterAcceptance(quote.id, conversationId);
      const result = { success: true, alreadyApplied: true, quoteNumber: quote.quoteNumber, status: "APPROVED" };
      return onboarding ? { ...result, customerOnboarding: onboarding } : result;
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
    const onboarding = await this.customerOnboarding?.ensureAfterAcceptance(quote.id, conversationId);
    const result = { success: true, quoteNumber: quote.quoteNumber, status: "APPROVED" };
    return onboarding ? { ...result, customerOnboarding: onboarding } : result;
  }

  private async prepareRejection(conversationId: string, turnId: string, args: ToolArguments) {
    const quote = await this.requiredCurrentQuote(conversationId, args);
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
    const quote = await this.requiredCurrentQuote(conversationId, args);
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
    const quoteNumber = this.requiredText(args.quoteNumber, "quoteNumber");
    const requestedChanges = this.requiredText(args.requestedChanges, "requestedChanges");
    return this.createCustomerRequest(conversationId, quoteNumber, "MODIFICATION", requestedChanges);
  }

  private async createInformationRequest(conversationId: string, args: ToolArguments) {
    const quoteNumber = this.requiredText(args.quoteNumber, "quoteNumber");
    const requestedInformation = this.requiredText(args.requestedInformation, "requestedInformation");
    return this.createCustomerRequest(conversationId, quoteNumber, "INFORMATION", requestedInformation);
  }

  private async createCustomerRequest(
    conversationId: string,
    quoteNumber: string,
    requestType: "INFORMATION" | "MODIFICATION",
    requestText: string,
  ) {
    const quote = await this.requiredCurrentQuote(conversationId, { quoteNumber });
    if (!["QUOTED", "APPROVED"].includes(quote.status)) {
      return { error: "QUOTE_DOES_NOT_ACCEPT_CHANGE_REQUESTS", currentStatus: quote.status };
    }
    const requestedByPhone = await this.repository.getParticipantPhone(conversationId);
    if (!requestedByPhone) throw new Error("WHATSAPP_CONVERSATION_NOT_FOUND");
    const result = await this.repository.createChangeRequest({
      conversationId,
      quoteId: quote.id,
      customerContactId: quote.contactId,
      requestedByPhone,
      requestedChanges: requestText,
      requestType,
    });
    if (result.created) {
      const occurredAt = new Date().toISOString();
      await this.realtime?.publish({
        type: "QUOTE_CUSTOMER_REQUEST",
        conversationId,
        reason: requestType === "INFORMATION" ? "CUSTOMER_INFORMATION_REQUESTED" : "CUSTOMER_CHANGE_REQUESTED",
        occurredAt,
        customerRequest: {
          requestId: result.id,
          requestType,
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          sellerId: quote.sellerId,
          branchId: quote.branchId,
          detail: requestText,
        },
      });
      await this.internalAlerts?.execute({
        eventKey: `customer-request:${result.id}`,
        type: requestType === "INFORMATION" ? "INFORMATION_REQUESTED" : "QUOTE_CHANGE_REQUESTED",
        recipientUserId: quote.sellerId,
        conversationId,
        quoteId: quote.id,
        reference: quote.quoteNumber,
        detail: requestText,
      });
    }
    return { success: true, requestId: result.id, created: result.created, sellerName: quote.sellerName };
  }

  private async contactSeller(conversationId: string, args: ToolArguments) {
    const quote = await this.requiredCurrentQuote(conversationId, args);
    return { sellerName: quote.sellerName, quoteNumber: quote.quoteNumber, requestRegistered: false };
  }

  private async requiredCurrentQuote(conversationId: string, args: ToolArguments) {
    const quoteNumber = this.requiredText(args.quoteNumber, "quoteNumber");
    const quote = await this.repository.findCurrentAuthorizedQuote(conversationId, quoteNumber);
    if (!quote) throw new Error("QUOTE_CURRENT_REVISION_NOT_AVAILABLE");
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

  private positiveInteger(value: unknown): number | null {
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
  }

  private onboardingInput(args: ToolArguments): CustomerOnboardingWriteInput {
    const fields: Array<keyof CustomerOnboardingWriteInput> = [
      "legalName", "taxId", "taxRegime", "cfdiUse", "billingStreet", "billingExteriorNumber",
      "billingInteriorNumber", "billingNeighborhood", "billingCity", "billingState", "billingPostalCode",
      "billingCountry", "contactName", "contactEmail", "contactPhone", "contactWhatsapp",
    ];
    return Object.fromEntries(fields.map((field) => [field, typeof args[field] === "string" ? args[field] : null]));
  }

}
