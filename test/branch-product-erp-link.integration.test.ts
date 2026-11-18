import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

const url = process.env.ERP_LINK_TEST_DATABASE_URL;

test("branch links preserve local products, historical quotes and issued supplier lines", { skip: !url }, async () => {
  const target = new URL(url!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/erp_link_test");
  process.env.DATABASE_URL = url;
  const { prisma } = await import("../src/infrastructure/database/prisma-client");
  const { PrismaPurchaseRequisitionDatasource } = await import("../src/infrastructure/datasources/prisma-purchase-requisition.datasource");
  const { assertVerifiedLocalQuoteLinks, listLocalProductErpLinks } = await import("../src/infrastructure/datasources/local-product-erp-links");
  const { PurchaseRequisitionUseCase } = await import("../src/domain/use-cases/purchase-requisition.use-case");
  const { PurchaseRequisitionRepositoryImpl } = await import("../src/infrastructure/repositories/purchase-requisition.repository-impl");
  const { LinkPurchaseRequisitionItemToErpRequestDto } = await import("../src/domain/dtos/request/purchase-requisition-request.dto");
  const { UpdateLocalTempProductRequestDto } = await import("../src/domain/dtos/request/update-local-temp-product-request.dto");
  const key = randomUUID().slice(0, 8);
  const now = new Date();
  const ds = new PrismaPurchaseRequisitionDatasource(false, true);
  const lookupCalls: Array<[string, string]> = [];
  const useCase = new PurchaseRequisitionUseCase(
    new PurchaseRequisitionRepositoryImpl(ds), {} as never,
    { findByCodeAndAccount: async (code, account) => {
      lookupCalls.push([code, account]);
      if ((code === "01300938" && account !== "1115001") || (code === "02300938" && account !== "1115002")) return null;
      if (code === "BAD") return null;
      return { code, unit: code === "UNIT" ? "K" : "PZ", ean: "TSC480", description: "ERP product" };
    } }, {} as never, {} as never,
  );
  try {
    const branches = await Promise.all(["01", "02"].map(code => prisma.branch.upsert({
      where: { code }, create: { code, name: `Branch ${code}` }, update: {},
    })));
    const buyers = await Promise.all(branches.map((branch, i) => prisma.user.create({
      data: { username: `b${i}-${key}`, email: `b${i}-${key}@example.invalid`, firstName: "Buyer", lastName: String(i),
        passwordHash: "unused", branchId: branch.id, role: "PURCHASING" },
    })));
    const seller = await prisma.user.create({
      data: { username: `s-${key}`, email: `s-${key}@example.invalid`, firstName: "Seller", lastName: "Test",
        passwordHash: "unused", branchId: branches[0].id, role: "SELLER" },
    });
    const product = await prisma.product.create({ data: { description: "Tubo local", unit: "PZ", code: "UNVERIFIED", branchId: branches[0].id } });
    const customer = await prisma.customer.create({
      data: { firstName: "Cliente", lastName: "Prueba", displayName: "Cliente Prueba", whatsapp: key },
    });
    async function createOrderContext(index: number, suffix: string, status: "APPROVED" | "QUOTED" = "APPROVED") {
      const quote = await prisma.quote.create({
        data: { quoteNumber: `TEST-${key}-${suffix}`, status, branchId: branches[index].id,
          createdByUserId: seller.id, customerId: customer.id, currency: "MXN", exchangeRate: 1, exchangeRateDate: now,
          taxRate: 0.16, subtotal: 20, tax: 3.2, total: 23.2, validUntil: now },
      });
      const quoteItem = await prisma.quoteItem.create({
        data: { quoteId: quote.id, position: 1, productId: product.id, unit: "PZ", qty: 2, stock: 0,
          cost: 8, costCurrency: "USD", marginPct: 25, unitPrice: 10, subtotal: 20 },
      });
      const requisition = await prisma.purchaseRequisition.create({
        data: { requisitionNumber: `REQ-${key}-${suffix}`, quoteId: quote.id, branchId: quote.branchId, requestedByUserId: seller.id,
          assignedBuyerUserId: buyers[index].id, status: "PARTIALLY_QUOTED" },
      });
      const item = await prisma.purchaseRequisitionItem.create({
        data: { requisitionId: requisition.id, quoteItemId: quoteItem.id, position: 1, productId: product.id, unit: "PZ",
          source: "LOCAL_NEW", status: "PENDING_ERP_CODE", qty: 2, description: "Tubo local", sellerUnitCost: 8,
          sellerCurrency: "MXN", sellerExchangeRate: 1, sellerCostSource: "ESTIMATED" },
      });
      return { quoteItem, requisition, item };
    }

    const mx = await createOrderContext(0, "mx");
    const mt = await createOrderContext(1, "mt");
    const historical = await createOrderContext(0, "history", "QUOTED");
    const buyer = buyers[0];
    assert.match(UpdateLocalTempProductRequestDto.create({ code: "UNVERIFIED" })[0]!, /requisición/);
    await assert.rejects(useCase.previewErpIdentity(mx.requisition.id, mx.item.id, "01300938", seller), /Solo Compras/);
    await assert.rejects(useCase.previewErpIdentity(mx.requisition.id, mx.item.id, "01300938", buyers[1]), /no encontrada/);
    await assert.rejects(useCase.previewErpIdentity(historical.requisition.id, historical.item.id, "01300938", buyer), /aprobada/);
    await assert.rejects(useCase.previewErpIdentity(mx.requisition.id, mx.item.id, "02300938", buyer), /no existe/);
    await assert.rejects(useCase.previewErpIdentity(mx.requisition.id, mx.item.id, "UNIT", buyer), /no coincide/);
    assert.equal((await useCase.previewErpIdentity(mx.requisition.id, mx.item.id, "01300938", buyer)).unit, "PZ");

    const supplier = await prisma.supplier.create({ data: { name: "Proveedor", canonicalName: "PROVEEDOR", createdByUserId: buyer.id } });
    const offer = await prisma.purchaseSupplierOffer.create({
      data: { requisitionItemId: mx.item.id, supplierId: supplier.id, qty: 2, unit: "PZ", unitCost: 8,
        currency: "MXN", subtotal: 16, tax: 2.56, total: 18.56, isSelected: true, awardedQty: 2, createdByUserId: buyer.id },
    });
    await ds.generateSupplierRequisitions(mx.requisition.id, buyer);
    const snapshot = await prisma.purchaseSupplierRequisitionLine.findUniqueOrThrow({ where: { offerId: offer.id } });
    assert.equal(snapshot.erpCode, null);
    const confirm = (context: typeof mx, code: string, actor: typeof buyer) => {
      const [, dto] = LinkPurchaseRequisitionItemToErpRequestDto.create({ erpCode: code, erpEan: "TSC480" });
      return useCase.linkItemToErp(context.requisition.id, context.item.id, dto!, actor);
    };
    await confirm(mx, "01300938", buyer);
    await assert.rejects(confirm(mx, "01300938", buyer), /ya fue emitido/);
    await confirm(mt, "02300938", buyers[1]);
    assert.deepEqual(lookupCalls.at(-1), ["02300938", "1115002"]);
    assert.deepEqual(await prisma.purchaseSupplierRequisitionLine.findUnique({ where: { offerId: offer.id } }), snapshot);
    assert.deepEqual(await prisma.purchaseSupplierOffer.findUnique({ where: { id: offer.id } }), offer);
    assert.equal(await ds.isReadyForOrder(mx.requisition.quoteId), true);
    assert.deepEqual(await prisma.quoteItem.findUnique({ where: { id: historical.quoteItem.id } }), historical.quoteItem);
    assert.deepEqual(await prisma.product.findUnique({ where: { id: product.id } }), product);
    const updated = await prisma.quoteItem.findUniqueOrThrow({ where: { id: mx.quoteItem.id } });
    assert.equal(updated.externalProductCode, "01300938");
    assert.equal(updated.productId, product.id);
    for (const name of ["qty", "stock", "unitPrice", "cost", "costCurrency"] as const) assert.deepEqual(updated[name], mx.quoteItem[name]);
    assert.equal((await listLocalProductErpLinks(product.id, seller, true))?.links[0].erpCode, "01300938");
    assert.equal((await listLocalProductErpLinks(product.id, { ...buyer, role: "ADMIN" }, false))?.links.length, 2);
    assert.equal(await prisma.auditLog.count({ where: { entityId: { in: [mx.item.id, mt.item.id] }, action: "ERP_CODE_VERIFIED" } }), 2);
    await assertVerifiedLocalQuoteLinks(prisma, branches[0].id, [updated]);
    await assert.rejects(assertVerifiedLocalQuoteLinks(prisma, branches[1].id, [updated]), /verificado/);
    await assert.rejects(assertVerifiedLocalQuoteLinks(prisma, branches[0].id, [{ ...updated, externalProductCode: "UNVERIFIED" }]), /verificado/);
    await assert.rejects(assertVerifiedLocalQuoteLinks(prisma, branches[0].id, [{ ...updated, unit: "TON" }]), /unidad/);
  } finally {
    await prisma.$disconnect();
  }
});
