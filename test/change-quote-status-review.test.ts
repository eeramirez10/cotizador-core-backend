import assert from "node:assert/strict";
import test from "node:test";
import type { ChangeQuoteStatusDatasourceParams } from "../src/domain/datasources/quote.datasource";
import { ChangeQuoteStatusRequestDto } from "../src/domain/dtos/request/change-quote-status-request.dto";
import type { QuoteEntity } from "../src/domain/entities/quote.entity";
import type { WhatsAppRealtimeEvent } from "../src/domain/events/whatsapp-realtime.event";
import { PurchaseRequisitionRepository } from "../src/domain/repositories/purchase-requisition.repository";
import { QuoteCatalogRepository } from "../src/domain/repositories/quote-catalog.repository";
import { QuoteRepository } from "../src/domain/repositories/quote.repository";
import { ChangeQuoteStatusUseCase } from "../src/domain/use-cases/change-quote-status.use-case";

test("status change recalculates stale local-product review flags", async () => {
  let statusParams: ChangeQuoteStatusDatasourceParams | null = null;
  const staleQuote = {
    id: "quote-1",
    status: "DRAFT",
    archivedAt: null,
    nextRevision: null,
    sourceChannel: "PHONE",
    commercialConditions: "CONDICIONES GENERALES",
    captureMethod: "SYSTEM",
    items: [{
      id: "item-1",
      productId: "local-product-1",
      externalProductCode: null,
      ean: null,
      erpDescription: null,
      customerDescription: "VALVULA ESPECIAL",
      qty: 2,
      unit: "PZ",
      unitPrice: 100,
      deliveryTime: "3-5 DIAS",
      sourceRequiresReview: false,
      requiresReview: true,
    }],
  } as unknown as QuoteEntity;
  const quoteRepository = {
    findById: async () => staleQuote,
    changeStatus: async (params: ChangeQuoteStatusDatasourceParams) => {
      statusParams = params;
      return { ...staleQuote, status: params.status } as QuoteEntity;
    },
  } as unknown as QuoteRepository;
  const useCase = new ChangeQuoteStatusUseCase(
    quoteRepository,
    {} as QuoteCatalogRepository,
    {} as PurchaseRequisitionRepository,
    false,
  );
  const dto = new ChangeQuoteStatusRequestDto({
    status: "PENDING_APPROVAL",
    note: null,
    rejectionReason: null,
    rejectionComment: null,
    cancellationReason: null,
    cancellationComment: null,
    approvalReturnReason: null,
    approvalReturnComment: null,
  });

  await useCase.execute("quote-1", dto, {
    id: "seller-1",
    role: "SELLER",
    branchId: "branch-1",
  });

  assert.ok(statusParams);
  assert.equal(statusParams.status, "QUOTED");
  assert.deepEqual(statusParams.itemReviewUpdates, [{
    itemId: "item-1",
    requiresReview: false,
  }]);
});

for (const decision of [
  { status: "APPROVED", reason: "QUOTE_ACCEPTED" },
  { status: "REJECTED", reason: "QUOTE_REJECTED" },
  { status: "CANCELLED", reason: "QUOTE_CANCELLED" },
] as const) {
  test(`publishes ${decision.reason} to the quote seller and branch`, async () => {
    const quote = {
      id: "quote-1",
      quoteNumber: "QT-20260918-000001",
      status: "QUOTED",
      archivedAt: null,
      nextRevision: null,
      captureMethod: "SYSTEM",
      branchId: "branch-1",
      createdByUserId: "seller-1",
      currency: "MXN",
      total: 1_160,
      updatedAt: new Date("2026-09-18T15:00:00.000Z"),
      customer: { displayName: "PROESA, SA DE CV" },
      customerContact: { name: "Luz Vázquez" },
      items: [],
    } as unknown as QuoteEntity;
    const events: WhatsAppRealtimeEvent[] = [];
    const quoteRepository = {
      findById: async () => quote,
      changeStatus: async (params: ChangeQuoteStatusDatasourceParams) => ({
        ...quote,
        status: params.status,
      }) as QuoteEntity,
    } as unknown as QuoteRepository;
    const catalogs = {
      findActiveByCode: async () => ({ requiresComment: false }),
    } as unknown as QuoteCatalogRepository;
    const requisitions = {
      ensureForApprovedQuote: async () => null,
    } as unknown as PurchaseRequisitionRepository;
    const realtime = {
      publish: async (event: WhatsAppRealtimeEvent) => { events.push(event); },
    };
    const useCase = new ChangeQuoteStatusUseCase(
      quoteRepository,
      catalogs,
      requisitions,
      false,
      realtime,
    );

    await useCase.execute("quote-1", new ChangeQuoteStatusRequestDto({
      status: decision.status,
      note: null,
      rejectionReason: decision.status === "REJECTED" ? "PRICE" : null,
      rejectionComment: null,
      cancellationReason: decision.status === "CANCELLED" ? "INTERNAL" : null,
      cancellationComment: null,
      approvalReturnReason: null,
      approvalReturnComment: null,
    }), {
      id: "seller-1",
      role: "SELLER",
      branchId: "branch-1",
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].type, "QUOTE_CUSTOMER_DECISION");
    assert.equal(events[0].reason, decision.reason);
    assert.equal(events[0].quoteDecision?.contactName, "Luz Vázquez");
    assert.deepEqual(events[0].audience?.userIds, ["seller-1"]);
    assert.deepEqual(events[0].audience?.branchIds, ["branch-1"]);
  });
}
