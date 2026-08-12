import assert from "node:assert/strict";
import test from "node:test";
import type { UpdateQuoteProcurementReferenceDatasourceParams } from "../src/domain/datasources/quote.datasource";
import { UpdateQuoteProcurementReferenceRequestDto } from "../src/domain/dtos/request/update-quote-procurement-reference-request.dto";
import type { PurchaseRequisitionEntity } from "../src/domain/entities/purchase-requisition.entity";
import type { QuoteEntity } from "../src/domain/entities/quote.entity";
import { PurchaseRequisitionRepository } from "../src/domain/repositories/purchase-requisition.repository";
import { QuoteRepository } from "../src/domain/repositories/quote.repository";
import { UpdateQuoteProcurementReferenceUseCase } from "../src/domain/use-cases/update-quote-procurement-reference.use-case";

const quote = (status: "QUOTED" | "APPROVED" = "QUOTED") => ({
  id: "quote-1",
  status,
  captureMethod: "SYSTEM",
  archivedAt: null,
  nextRevision: null,
  items: [{
    id: "quote-item-1",
    clientItemId: "client-item-1",
    externalProductCode: "01300001",
    product: null,
    stock: 2,
    qty: 10,
  }],
}) as unknown as QuoteEntity;

const request = () => {
  const [error, dto] = UpdateQuoteProcurementReferenceRequestDto.create({
    sellerSupplierId: "supplier-1",
    sellerSupplierName: "PROVEEDOR DEMO",
    sellerQuotedUnitCost: 125,
    sellerCostSource: "SELLER_SUPPLIER_QUOTE",
    sellerQuotedCurrency: "MXN",
    sellerQuotedExchangeRate: null,
    sellerDeliveryState: "QUERETARO",
    sellerSupplierDeliveryTime: "3-5 DIAS",
  });
  assert.equal(error, undefined);
  return dto!;
};

const actor = { id: "seller-1", role: "SELLER" as const, branchId: "branch-1" };

test("seller can add purchasing reference to an own quoted out-of-stock item", async () => {
  const current = quote();
  let update: UpdateQuoteProcurementReferenceDatasourceParams | null = null;
  const quotes = {
    findById: async () => current,
    updateProcurementReference: async (params: UpdateQuoteProcurementReferenceDatasourceParams) => {
      update = params;
      return current;
    },
  } as unknown as QuoteRepository;
  const requisitions = {} as PurchaseRequisitionRepository;

  await new UpdateQuoteProcurementReferenceUseCase(quotes, requisitions)
    .execute(current.id, "client-item-1", request(), actor);

  assert.ok(update);
  assert.equal(update.itemId, "quote-item-1");
  assert.equal(update.data.sellerQuotedUnitCost, 125);
  assert.equal(update.data.sellerCostSource, "SELLER_SUPPLIER_QUOTE");
});

test("purchasing reference is locked after an approved requisition leaves draft", async () => {
  const current = quote("APPROVED");
  const quotes = { findById: async () => current } as unknown as QuoteRepository;
  const requisitions = {
    findByQuoteId: async () => ({ status: "SUBMITTED" }) as PurchaseRequisitionEntity,
  } as unknown as PurchaseRequisitionRepository;

  await assert.rejects(
    () => new UpdateQuoteProcurementReferenceUseCase(quotes, requisitions)
      .execute(current.id, "client-item-1", request(), actor),
    /locked after the requisition is sent/i,
  );
});
