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
    unitPrice: 180,
  }],
}) as unknown as QuoteEntity;

const request = (unitPrice?: number) => {
  const [error, dto] = UpdateQuoteProcurementReferenceRequestDto.create({
    sellerSupplierId: "supplier-1",
    sellerSupplierName: "PROVEEDOR DEMO",
    sellerQuotedUnitCost: 125,
    ...(unitPrice === undefined ? {} : { unitPrice }),
    sellerCostSource: "SELLER_SUPPLIER_QUOTE",
    sellerQuotedCurrency: "MXN",
    sellerQuotedExchangeRate: null,
    sellerDeliveryState: "QUERETARO",
    sellerSupplierDeliveryTime: "3-5 DIAS",
    sellerSupplierOrigin: "MEXICO",
    sellerOriginRestrictions: ["SIN RESTRICCIÓN"],
    sellerSupplierProductCode: " val-500 ",
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
  assert.equal("unitPrice" in update.data, false);
  assert.equal(update.data.sellerCostSource, "SELLER_SUPPLIER_QUOTE");
  assert.equal(update.data.sellerSupplierProductCode, "VAL-500");
});

test("purchasing reference cannot change the customer's price", async () => {
  const current = { ...quote(), firstSentAt: new Date() } as QuoteEntity;
  const quotes = { findById: async () => current } as unknown as QuoteRepository;
  await assert.rejects(
    () => new UpdateQuoteProcurementReferenceUseCase(quotes, {} as PurchaseRequisitionRepository)
      .execute(current.id, "client-item-1", request(190), actor),
    /se modifica en la cotización/,
  );
});

test("seller supplier code rejects invalid or oversized values", () => {
  const base = {
    sellerSupplierId: "supplier-1", sellerSupplierName: "PROVEEDOR DEMO",
    sellerQuotedUnitCost: 125, unitPrice: 180, sellerCostSource: "SELLER_SUPPLIER_QUOTE",
    sellerQuotedCurrency: "MXN", sellerDeliveryState: "QUERETARO",
    sellerSupplierDeliveryTime: "3-5 DIAS",
    sellerSupplierOrigin: "MEXICO", sellerOriginRestrictions: ["SIN RESTRICCIÓN"],
  };
  assert.match(UpdateQuoteProcurementReferenceRequestDto.create({ ...base, sellerSupplierProductCode: 123 })[0] || "", /invalid/);
  assert.match(UpdateQuoteProcurementReferenceRequestDto.create({ ...base, sellerSupplierProductCode: "X".repeat(121) })[0] || "", /120/);
});

test("seller references require an explicit restriction and origin", () => {
  const base = {
    sellerSupplierId: "supplier-1", sellerSupplierName: "PROVEEDOR DEMO",
    sellerQuotedUnitCost: 125, sellerCostSource: "SELLER_SUPPLIER_QUOTE",
    sellerQuotedCurrency: "MXN", sellerDeliveryState: "QUERETARO",
    sellerSupplierDeliveryTime: "3-5 DIAS", sellerSupplierOrigin: "MEXICO",
    sellerOriginRestrictions: ["SIN RESTRICCIÓN"],
  };
  assert.match(UpdateQuoteProcurementReferenceRequestDto.create({ ...base, sellerSupplierOrigin: "" })[0] || "", /sellerSupplierOrigin/);
  assert.match(UpdateQuoteProcurementReferenceRequestDto.create({ ...base, sellerOriginRestrictions: [] })[0] || "", /restricción/);
});

test("purchasing reference is locked after an approved requisition leaves draft", async () => {
  const current = quote("APPROVED");
  const quotes = { findById: async () => current } as unknown as QuoteRepository;
  const requisitions = {
    findByQuoteId: async () => [{ status: "SUBMITTED", supplierId: "supplier-1", items: [{ quoteItemId: "quote-item-1" }] }] as PurchaseRequisitionEntity[],
  } as unknown as PurchaseRequisitionRepository;

  await assert.rejects(
    () => new UpdateQuoteProcurementReferenceUseCase(quotes, requisitions)
      .execute(current.id, "client-item-1", request(), actor),
    /locked after the requisition is sent/i,
  );
});

test("approved quote blocks changing the supplier of an existing draft requisition before saving", async () => {
  const current = quote("APPROVED");
  let saved = false;
  const quotes = {
    findById: async () => current,
    updateProcurementReference: async () => { saved = true; return current; },
  } as unknown as QuoteRepository;
  const requisitions = {
    findByQuoteId: async () => [{ status: "DRAFT", supplierId: "supplier-2", items: [{ quoteItemId: "quote-item-1" }] }] as PurchaseRequisitionEntity[],
  } as unknown as PurchaseRequisitionRepository;

  await assert.rejects(
    () => new UpdateQuoteProcurementReferenceUseCase(quotes, requisitions)
      .execute(current.id, "client-item-1", request(), actor),
    /no se puede cambiar su proveedor/i,
  );
  assert.equal(saved, false);
});

test("another supplier's submitted requisition does not block a pending item", async () => {
  const current = quote("APPROVED");
  let saved = false;
  const quotes = {
    findById: async () => current,
    updateProcurementReference: async () => { saved = true; return current; },
  } as unknown as QuoteRepository;
  const requisitions = {
    findByQuoteId: async () => [{ status: "SUBMITTED", supplierId: "supplier-2", items: [{ quoteItemId: "other-item" }] }] as PurchaseRequisitionEntity[],
    ensureForApprovedQuote: async () => [],
  } as unknown as PurchaseRequisitionRepository;

  await new UpdateQuoteProcurementReferenceUseCase(quotes, requisitions)
    .execute(current.id, "client-item-1", request(), actor);
  assert.equal(saved, true);
});
