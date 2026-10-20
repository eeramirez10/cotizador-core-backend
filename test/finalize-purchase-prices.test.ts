import assert from "node:assert/strict";
import test from "node:test";
import type { FileStoragePort } from "../src/domain/contracts/file-storage.port";
import type { LocalProductSemanticPort } from "../src/domain/contracts/local-product-semantic.port";
import type { ErpProductLookupPort } from "../src/domain/contracts/erp-product-lookup.port";
import type { ErpSupplierLookupPort } from "../src/domain/contracts/erp-supplier-lookup.port";
import type { PurchasePriceNotificationPort } from "../src/domain/contracts/purchase-price-notification.port";
import type { PurchaseRequisitionActor } from "../src/domain/datasources/purchase-requisition.datasource";
import type { PurchaseRequisitionEntity } from "../src/domain/entities/purchase-requisition.entity";
import type { PurchaseRequisitionRepository } from "../src/domain/repositories/purchase-requisition.repository";
import type { QuoteRepository } from "../src/domain/repositories/quote.repository";
import { PurchaseRequisitionUseCase } from "../src/domain/use-cases/purchase-requisition.use-case";

const actor: PurchaseRequisitionActor = { id: "buyer", branchId: "branch", role: "PURCHASING" };
const requisition = (id: string): PurchaseRequisitionEntity => ({
  id, quoteId: "quote", quoteStatus: "DRAFT", createdAt: new Date(), updatedAt: new Date(),
  supplierRequisitions: [], items: [{
    qty: 2, createdAt: new Date(), updatedAt: new Date(), offers: [{
      isSelected: true, awardedQty: 2, createdAt: new Date(), updatedAt: new Date(),
      quoteDate: new Date(), supplier: { createdAt: new Date(), updatedAt: new Date() },
    }],
  }],
} as unknown as PurchaseRequisitionEntity);

test("buyer notifies the seller only on explicit quote-level price finalization", async () => {
  const notifications: string[][] = [];
  let finalizedQuoteId: string | undefined;
  const repository = {
    selectOffer: async () => requisition("req-a"),
    allocateOffers: async () => requisition("req-a"),
    finalizePricesForQuote: async (quoteId: string) => {
      finalizedQuoteId = quoteId;
      return [requisition("req-a"), requisition("req-b")];
    },
  } as unknown as PurchaseRequisitionRepository;
  const notifier = {
    ready: async (items: PurchaseRequisitionEntity[]) => { notifications.push(items.map((item) => item.id)); },
  } as PurchasePriceNotificationPort;
  const useCase = new PurchaseRequisitionUseCase(
    repository, {} as QuoteRepository, {} as LocalProductSemanticPort,
    {} as ErpProductLookupPort, {} as ErpSupplierLookupPort, {} as FileStoragePort, notifier,
  );
  await useCase.selectOffer("req-a", "item", "offer", actor);
  await useCase.allocateOffers("req-a", "item", [{ offerId: "offer", qty: 2 }], actor);
  assert.deepEqual(notifications, []);
  await useCase.finalizePricesForQuote("quote", actor);
  assert.equal(finalizedQuoteId, "quote");
  assert.deepEqual(notifications, [["req-a", "req-b"]]);
  await assert.rejects(useCase.finalizePricesForQuote("quote", { ...actor, role: "SELLER" }), /Only ADMIN or PURCHASING/);
});
