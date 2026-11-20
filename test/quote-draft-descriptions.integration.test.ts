import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type { CustomerRepository } from "../src/domain/repositories/customer.repository";
import type { UserRepository } from "../src/domain/repositories/user.repository";

const url = process.env.QUOTE_DRAFT_TEST_DATABASE_URL;

test("long descriptions round-trip through draft save, revisions and purchasing without truncation", { skip: !url }, async () => {
  const target = new URL(url!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/quote_draft_test");
  process.env.DATABASE_URL = url;
  const { prisma } = await import("../src/infrastructure/database/prisma-client");
  const { PrismaQuoteDatasource } = await import("../src/infrastructure/datasources/prisma-quote.datasource");
  const { QuoteRepositoryImpl } = await import("../src/infrastructure/repositories/quote.repository-impl");
  const { SaveQuoteDraftUseCase } = await import("../src/domain/use-cases/save-quote-draft.use-case");
  const { SaveQuoteDraftRequestDto } = await import("../src/domain/dtos/request/save-quote-draft-request.dto");
  const { PrismaPurchaseRequisitionDatasource } = await import("../src/infrastructure/datasources/prisma-purchase-requisition.datasource");
  const key = randomUUID().slice(0, 8);
  const description = "Á".repeat(518);
  const original = "Ó".repeat(552);
  const supplierDescription = "Ñ".repeat(1200);
  try {
    const branch = await prisma.branch.create({ data: { code: key, name: "Description regression" } });
    const seller = await prisma.user.create({ data: { username: key, email: `${key}@example.invalid`,
      firstName: "Seller", lastName: "Regression", passwordHash: "unused", branchId: branch.id, role: "SELLER" } });
    const buyer = await prisma.user.create({ data: { username: `b-${key}`, email: `b-${key}@example.invalid`,
      firstName: "Buyer", lastName: "Regression", passwordHash: "unused", branchId: branch.id, role: "PURCHASING" } });
    const customer = await prisma.customer.create({ data: { firstName: "Customer", lastName: "Regression", displayName: key, whatsapp: key } });
    const product = await prisma.product.create({ data: { description: "Local product", unit: "PZ", branchId: branch.id } });
    const supplier = await prisma.supplier.create({ data: { name: `Supplier ${key}`, canonicalName: `SUPPLIER ${key}`, createdByUserId: seller.id } });
    const datasource = new PrismaQuoteDatasource();
    const useCase = new SaveQuoteDraftUseCase(new QuoteRepositoryImpl(datasource), {
      findById: async () => ({ ...customer, contacts: [] }),
    } as unknown as CustomerRepository, {} as UserRepository, false);
    const request = {
      quoteId: null as string | null, customerId: customer.id, action: "SAVE_DRAFT", currency: "USD",
      exchangeRate: 19.027, exchangeRateDate: "2026-11-20", taxRate: 0.16, paymentTerms: "CONTADO", validityDays: 10,
      items: [{ clientItemId: "line-1", productId: product.id, unit: "PZ", qty: 1, stock: 0,
        customerDescription: description, customerDescriptionOriginal: original, erpDescription: description,
        sellerSupplierId: supplier.id, sellerSupplierDescription: supplierDescription,
        cost: 0, costCurrency: "MXN", unitPrice: 11112, deliveryTime: "6-8 semanas" }],
    };
    const save = async () => {
      const [error, dto] = SaveQuoteDraftRequestDto.create(request);
      assert.equal(error, undefined);
      return (await useCase.execute(`draft-${key}`, dto!, seller)).toJSON();
    };
    const created = await save();
    request.quoteId = created.id;
    let stored = await prisma.quoteItem.findFirstOrThrow({ where: { quoteId: created.id } });
    assert.equal(stored.customerDescription, description);
    assert.equal(stored.customerDescriptionOriginal, original);
    assert.equal(stored.erpDescription, description);
    assert.equal(stored.sellerSupplierDescription, supplierDescription);
    assert.equal(Number(stored.unitPrice), 11112);
    assert.equal(Number(stored.cost), 0);
    request.items[0].customerDescription = "E".repeat(1600);
    await save();
    stored = await prisma.quoteItem.findFirstOrThrow({ where: { quoteId: created.id } });
    assert.equal(stored.customerDescription, request.items[0].customerDescription);
    assert.equal(stored.customerDescriptionOriginal, original);
    assert.equal(stored.customerDescriptionEditedByUserId, seller.id);

    const requisition = await prisma.purchaseRequisition.create({ data: { requisitionNumber: `REQ-${key}`, quoteId: created.id,
      branchId: branch.id, requestedByUserId: seller.id, status: "PARTIALLY_QUOTED" } });
    const requisitionItem = await prisma.purchaseRequisitionItem.create({ data: { requisitionId: requisition.id,
      quoteItemId: stored.id, position: 1, productId: product.id, source: "LOCAL_NEW", unit: "PZ", qty: 1,
      description: stored.customerDescription!, status: "PENDING_ERP_CODE", sellerUnitCost: 0,
      sellerCurrency: "MXN", sellerExchangeRate: 1, sellerCostSource: "ESTIMATED" } });
    const lineId = stored.id;
    // Requisition-bound drafts take the update-in-place path rather than createMany.
    await save();
    stored = await prisma.quoteItem.findFirstOrThrow({ where: { quoteId: created.id } });
    assert.equal(stored.id, lineId);
    assert.equal(stored.customerDescriptionOriginal, original);

    const offer = await prisma.purchaseSupplierOffer.create({ data: { requisitionItemId: requisitionItem.id, supplierId: supplier.id,
      supplierDescription, qty: 1, unit: "PZ", unitCost: 10, currency: "USD", exchangeRate: 19.027,
      subtotal: 10, tax: 1.6, total: 11.6, isSelected: true, awardedQty: 1, createdByUserId: seller.id } });
    await prisma.quote.update({ where: { id: created.id }, data: { status: "APPROVED" } });
    await new PrismaPurchaseRequisitionDatasource(false, true).generateSupplierRequisitions(requisition.id, buyer);
    const snapshot = await prisma.purchaseSupplierRequisitionLine.findUniqueOrThrow({ where: { offerId: offer.id } });
    assert.equal(snapshot.description, supplierDescription);
    assert.equal((await prisma.purchaseRequisitionItem.findUniqueOrThrow({ where: { id: requisitionItem.id } })).description, stored.customerDescription);

    // A rejected short field must not delete/recreate saved rows or change quote totals.
    const before = await prisma.quote.findUniqueOrThrow({ where: { id: created.id } });
    request.items[0].unit = "X".repeat(31);
    const [error] = SaveQuoteDraftRequestDto.create(request);
    assert.match(error!, /^Partida 1:.*unit.*30.*31/);
    await assert.rejects(datasource.saveDraft({ items: [{ unit: "X".repeat(31) }] } as never), /^Error: Partida 1:.*unit.*30.*31/);
    assert.deepEqual(await prisma.quote.findUniqueOrThrow({ where: { id: created.id } }), before);
    assert.deepEqual(await prisma.quoteItem.findUniqueOrThrow({ where: { id: lineId } }), stored);

    await prisma.quote.update({ where: { id: created.id }, data: { status: "QUOTED" } });
    const revision = await datasource.createRevision({ sourceQuoteId: created.id, reason: "PRICE_CHANGE", comment: null,
      actorUserId: seller.id, scope: { role: seller.role, userId: seller.id, branchId: branch.id } });
    assert.equal(revision.items[0].customerDescription, stored.customerDescription);
    assert.equal(revision.items[0].customerDescriptionOriginal, original);
    assert.equal(revision.items[0].sellerSupplierDescription, supplierDescription);
    assert.deepEqual(await prisma.quoteItem.findUniqueOrThrow({ where: { id: lineId } }), stored);
  } finally {
    await prisma.$disconnect();
  }
});
