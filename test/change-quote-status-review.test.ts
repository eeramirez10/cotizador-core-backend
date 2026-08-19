import assert from "node:assert/strict";
import test from "node:test";
import type { ChangeQuoteStatusDatasourceParams } from "../src/domain/datasources/quote.datasource";
import { ChangeQuoteStatusRequestDto } from "../src/domain/dtos/request/change-quote-status-request.dto";
import type { QuoteEntity } from "../src/domain/entities/quote.entity";
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
