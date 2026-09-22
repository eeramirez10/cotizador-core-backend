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
  async searchAuthorizedQuoteItems(input: {
    quoteNumber: string;
    query: string | null;
    position: number | null;
  }) {
    if (input.quoteNumber !== quote.quoteNumber) return null;
    return {
      quoteNumber: quote.quoteNumber,
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
  async listRejectionReasons() { return [{ code: "OTHER", label: "Otro", requiresComment: true }]; }
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
      quoteNumber: quote.quoteNumber,
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
  async createChangeRequest(input: { requestType: "INFORMATION" | "MODIFICATION" }) {
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
