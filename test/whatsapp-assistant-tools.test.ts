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

  async getParticipantPhone() { return "+525511223344"; }
  async claimNextJob() { return null; }
  async completeJob() {}
  async failJob() {}
  async listAuthorizedQuotes() { return [quote]; }
  async findAuthorizedQuote(_conversationId: string, quoteNumber: string) {
    return quoteNumber === quote.quoteNumber ? quote : null;
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
  async createChangeRequest() { return { id: "request-1", created: true }; }
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
});
