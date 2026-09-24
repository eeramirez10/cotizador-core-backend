import assert from "node:assert/strict";
import test from "node:test";
import type {
  WhatsAppAssistantActionType,
  WhatsAppAssistantQuoteDetails,
  WhatsAppPendingActionEntity,
} from "../src/domain/entities/whatsapp-assistant.entity";
import { WhatsAppAssistantRepository } from "../src/domain/repositories/whatsapp-assistant.repository";
import { ExecuteWhatsAppAssistantToolUseCase } from "../src/domain/use-cases/execute-whatsapp-assistant-tool.use-case";

const quote: WhatsAppAssistantQuoteDetails = {
  id: "quote-1",
  quoteNumber: "QT-20260907-000001",
  status: "QUOTED",
  currency: "USD",
  subtotal: 100,
  tax: 16,
  total: 116,
  validUntil: new Date("2026-09-22T00:00:00Z"),
  sentAt: new Date("2026-09-07T12:00:00Z"),
  sellerName: "Alma Martínez",
  itemDescriptions: ["VÁLVULA DE ACERO"],
  deliveryPlace: "México",
  paymentTerms: "Contado",
  revisionNumber: 0,
  orderStatus: "NOT_GENERATED",
  contactId: "contact-1",
  sellerId: "seller-1",
  branchId: "branch-1",
};

class RepositoryStub extends WhatsAppAssistantRepository {
  pending: (WhatsAppPendingActionEntity & { preparedTurnId: string }) | null = null;
  audience: "CUSTOMER" | "INTERNAL_USER" | "UNKNOWN" = "CUSTOMER";
  customerSource: "LOCAL" | "ERP" = "LOCAL";
  sharedCustomerPhone = false;
  requestTypes: Array<"INFORMATION" | "MODIFICATION"> = [];
  requestedQuoteIds: string[] = [];
  currentRevision: WhatsAppAssistantQuoteDetails | null = null;
  currentRevisionUnavailable = false;
  lastReasonQuoteNumber: string | null = null;

  async getPrincipal() {
    return {
      audience: this.audience,
      displayName: "Cliente",
      phoneE164: "+525511223344",
      userId: null,
      role: null,
      branchId: null,
      branchName: null,
      reportScope: null,
      reportBranchId: null,
      reportRange: null,
      isVerified: false,
      sharedCustomerPhone: this.sharedCustomerPhone,
      customerSource: this.customerSource,
    };
  }
  async getParticipantPhone() { return "+525511223344"; }
  async claimNextJob() { return null; }
  async completeJob() {}
  async failJob() {}
  async listAuthorizedQuotes() { return [quote]; }
  async findAuthorizedQuote(_conversationId: string, quoteNumber: string) {
    return quoteNumber === quote.quoteNumber ? quote : null;
  }
  async findCurrentAuthorizedQuote(conversationId: string, quoteNumber: string) {
    if (this.currentRevisionUnavailable) return null;
    if (this.currentRevision && [quote.quoteNumber, this.currentRevision.quoteNumber].includes(quoteNumber)) {
      return this.currentRevision;
    }
    return this.findAuthorizedQuote(conversationId, quoteNumber);
  }
  async searchAuthorizedQuoteItems(input: {
    quoteNumber: string;
    query: string | null;
    position: number | null;
  }) {
    if (input.quoteNumber !== (this.currentRevision?.quoteNumber ?? quote.quoteNumber)) return null;
    return {
      quoteNumber: input.quoteNumber,
      currency: quote.currency,
      totalMatches: 1,
      truncated: false,
      items: [{
        position: input.position || 1,
        code: "01300492",
        description: "VÁLVULA DE ACERO",
        quantity: 2,
        unit: "PZ",
        unitPrice: 50,
        lineTotal: 100,
        deliveryTime: "3 a 5 días",
        customerComment: null,
      }],
    };
  }
  async listRejectionReasons(_conversationId: string, quoteNumber: string) {
    this.lastReasonQuoteNumber = quoteNumber;
    return [{ code: "OTHER", label: "Otro", requiresComment: true }];
  }
  async prepareAction(input: {
    conversationId: string;
    preparedTurnId: string;
    quoteId: string;
    actionType: WhatsAppAssistantActionType;
    payload: Record<string, unknown>;
    expiresAt: Date;
  }) {
    this.pending = {
      id: "action-1",
      quoteId: input.quoteId,
      quoteNumber: this.currentRevision?.id === input.quoteId ? this.currentRevision.quoteNumber : quote.quoteNumber,
      actionType: input.actionType,
      payload: input.payload,
      expiresAt: input.expiresAt,
      preparedTurnId: input.preparedTurnId,
    };
    return this.pending;
  }
  async findPendingAction(input: {
    conversationId: string;
    currentTurnId: string;
    quoteId: string;
    actionType: WhatsAppAssistantActionType;
    now: Date;
  }) {
    if (!this.pending || this.pending.preparedTurnId === input.currentTurnId) return null;
    return this.pending;
  }
  async markActionExecuted() { this.pending = null; }
  async createChangeRequest(input: { quoteId: string; requestType: "INFORMATION" | "MODIFICATION" }) {
    this.requestedQuoteIds.push(input.quoteId);
    this.requestTypes.push(input.requestType);
    return { id: "request-1", created: true };
  }
}

class ChangeStatusStub {
  calls: unknown[][] = [];
  async execute(...args: unknown[]) {
    this.calls.push(args);
    return quote;
  }
}

test("acceptance requires a later WhatsApp turn before changing status", async () => {
  const repository = new RepositoryStub();
  const changeStatus = new ChangeStatusStub();
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, changeStatus as never);

  await useCase.execute("conversation-1", "turn-1", "prepare_quote_acceptance", {
    quoteNumber: quote.quoteNumber,
  });
  const sameTurn = await useCase.execute("conversation-1", "turn-1", "confirm_quote_acceptance", {
    quoteNumber: quote.quoteNumber,
  });

  assert.deepEqual(sameTurn, { error: "CONFIRMATION_NOT_FOUND_OR_EXPIRED" });
  assert.equal(changeStatus.calls.length, 0);

  const nextTurn = await useCase.execute("conversation-1", "turn-2", "confirm_quote_acceptance", {
    quoteNumber: quote.quoteNumber,
  });
  assert.deepEqual(nextTurn, { success: true, quoteNumber: quote.quoteNumber, status: "APPROVED" });
  assert.equal(changeStatus.calls.length, 1);
  assert.deepEqual((changeStatus.calls[0][2] as { auditActorUserId: null }).auditActorUserId, null);
});

test("accepting the original folio confirms and approves the current revision", async () => {
  const repository = new RepositoryStub();
  const revision = {
    ...quote,
    id: "quote-r01",
    quoteNumber: `${quote.quoteNumber}-R01`,
    revisionNumber: 1,
    total: 145,
  };
  repository.currentRevision = revision;
  const changeStatus = new ChangeStatusStub();
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, changeStatus as never);

  const prepared = await useCase.execute("conversation-1", "turn-1", "prepare_quote_acceptance", {
    quoteNumber: quote.quoteNumber,
  }) as { quote: { quoteNumber: string; total: number } };
  assert.equal(prepared.quote.quoteNumber, revision.quoteNumber);
  assert.equal(prepared.quote.total, revision.total);

  const confirmed = await useCase.execute("conversation-1", "turn-2", "confirm_quote_acceptance", {
    quoteNumber: quote.quoteNumber,
  });
  assert.deepEqual(confirmed, { success: true, quoteNumber: revision.quoteNumber, status: "APPROVED" });
  assert.equal(changeStatus.calls[0][0], revision.id);
});

test("does not accept an older quote when the current revision is unavailable", async () => {
  const repository = new RepositoryStub();
  repository.currentRevisionUnavailable = true;
  const changeStatus = new ChangeStatusStub();
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, changeStatus as never);

  await assert.rejects(
    () => useCase.execute("conversation-1", "turn-1", "prepare_quote_acceptance", { quoteNumber: quote.quoteNumber }),
    /QUOTE_CURRENT_REVISION_NOT_AVAILABLE/,
  );
  assert.equal(changeStatus.calls.length, 0);
});

test("change requests are recorded without changing quote status", async () => {
  const repository = new RepositoryStub();
  const changeStatus = new ChangeStatusStub();
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, changeStatus as never);

  const result = await useCase.execute("conversation-1", "turn-1", "create_quote_change_request", {
    quoteNumber: quote.quoteNumber,
    requestedChanges: "Agregar dos válvulas más.",
  });

  assert.deepEqual(result, { success: true, requestId: "request-1", created: true, sellerName: "Alma Martínez" });
  assert.equal(changeStatus.calls.length, 0);
  assert.deepEqual(repository.requestTypes, ["MODIFICATION"]);
});

test("a change request for an old folio is assigned to its current revision", async () => {
  const repository = new RepositoryStub();
  repository.currentRevision = { ...quote, id: "quote-r01", quoteNumber: `${quote.quoteNumber}-R01`, revisionNumber: 1 };
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, new ChangeStatusStub() as never);

  await useCase.execute("conversation-1", "turn-1", "create_quote_change_request", {
    quoteNumber: quote.quoteNumber,
    requestedChanges: "Cambiar la cantidad de la válvula.",
  });

  assert.deepEqual(repository.requestedQuoteIds, ["quote-r01"]);
});

test("details, items and rejection reasons use the latest revision for an old folio", async () => {
  const repository = new RepositoryStub();
  repository.currentRevision = {
    ...quote,
    id: "quote-r01",
    quoteNumber: `${quote.quoteNumber}-R01`,
    revisionNumber: 1,
    total: 145,
  };
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, new ChangeStatusStub() as never);

  const details = await useCase.execute("conversation-1", "turn-1", "get_quote_details", {
    quoteNumber: quote.quoteNumber,
  }) as { quote: { quoteNumber: string; total: number } };
  const items = await useCase.execute("conversation-1", "turn-1", "search_quote_items", {
    quoteNumber: quote.quoteNumber,
    position: 1,
  }) as { quoteNumber: string };
  await useCase.execute("conversation-1", "turn-1", "list_rejection_reasons", {
    quoteNumber: quote.quoteNumber,
  });

  assert.equal(details.quote.quoteNumber, repository.currentRevision.quoteNumber);
  assert.equal(details.quote.total, 145);
  assert.equal(items.quoteNumber, repository.currentRevision.quoteNumber);
  assert.equal(repository.lastReasonQuoteNumber, repository.currentRevision.quoteNumber);
});

test("specific quote items expose only customer-safe commercial data", async () => {
  const repository = new RepositoryStub();
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, new ChangeStatusStub() as never);

  const result = await useCase.execute("conversation-1", "turn-1", "search_quote_items", {
    quoteNumber: quote.quoteNumber,
    position: 1,
    query: null,
  });

  assert.deepEqual(result, {
    quoteNumber: quote.quoteNumber,
    currency: "USD",
    totalMatches: 1,
    truncated: false,
    items: [{
      position: 1,
      code: "01300492",
      description: "VÁLVULA DE ACERO",
      quantity: 2,
      unit: "PZ",
      unitPrice: 50,
      lineTotal: 100,
      deliveryTime: "3 a 5 días",
      customerComment: null,
    }],
  });
  assert.equal(Object.hasOwn(result as object, "cost"), false);
  assert.equal(Object.hasOwn(result as object, "margin"), false);
});

test("information requests are recorded separately from modification requests", async () => {
  const repository = new RepositoryStub();
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, new ChangeStatusStub() as never);

  const result = await useCase.execute("conversation-1", "turn-1", "create_quote_information_request", {
    quoteNumber: quote.quoteNumber,
    requestedInformation: "Confirmar los tiempos de entrega de todas las partidas.",
  });

  assert.deepEqual(result, { success: true, requestId: "request-1", created: true, sellerName: "Alma Martínez" });
  assert.deepEqual(repository.requestTypes, ["INFORMATION"]);
});

test("internal numbers cannot execute customer quote tools", async () => {
  const repository = new RepositoryStub();
  repository.audience = "INTERNAL_USER";
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, new ChangeStatusStub() as never);

  await assert.rejects(
    () => useCase.execute("conversation-1", "turn-1", "list_customer_quotes", { limit: 5 }),
    /CUSTOMER_ASSISTANT_NOT_AUTHORIZED/,
  );
});

test("ERP customers cannot use fiscal onboarding tools", async () => {
  const repository = new RepositoryStub();
  repository.customerSource = "ERP";
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, new ChangeStatusStub() as never);

  await assert.rejects(
    () => useCase.execute("conversation-1", "turn-1", "get_customer_onboarding", {}),
    /CUSTOMER_ONBOARDING_LOCAL_ONLY/,
  );
  await assert.rejects(
    () => useCase.execute("conversation-1", "turn-1", "process_customer_tax_document", { attachmentId: "file-1" }),
    /CUSTOMER_ONBOARDING_LOCAL_ONLY/,
  );
});

test("the assistant cannot extract a fiscal PDF before seller review", async () => {
  const repository = new RepositoryStub();
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, new ChangeStatusStub() as never);

  assert.deepEqual(
    await useCase.execute("conversation-1", "turn-1", "process_customer_tax_document", { attachmentId: "file-1" }),
    { error: "TAX_DOCUMENT_REQUIRES_SELLER_REVIEW" },
  );
});

test("shared customer phones require a folio instead of listing customers' quotes", async () => {
  const repository = new RepositoryStub();
  repository.sharedCustomerPhone = true;
  const useCase = new ExecuteWhatsAppAssistantToolUseCase(repository, new ChangeStatusStub() as never);

  assert.deepEqual(await useCase.execute("conversation-1", "turn-1", "list_customer_quotes", { limit: 5 }), {
    error: "QUOTE_NUMBER_REQUIRED_FOR_SHARED_PHONE",
  });
  assert.deepEqual(await useCase.execute("conversation-1", "turn-1", "get_customer_onboarding", {}), {
    error: "QUOTE_NUMBER_REQUIRED_FOR_SHARED_PHONE",
  });
  const result = await useCase.execute("conversation-1", "turn-1", "get_quote_details", {
    quoteNumber: quote.quoteNumber,
  });
  assert.equal((result as { quote: { quoteNumber: string } }).quote.quoteNumber, quote.quoteNumber);
});
