import assert from "node:assert/strict";
import test from "node:test";
import type { FileStoragePort } from "../src/domain/contracts/file-storage.port";
import type { LocalProductSemanticPort } from "../src/domain/contracts/local-product-semantic.port";
import type { ErpProductLookupPort } from "../src/domain/contracts/erp-product-lookup.port";
import type { ErpSupplierLookupPort } from "../src/domain/contracts/erp-supplier-lookup.port";
import type { PurchaseRequisitionActor } from "../src/domain/datasources/purchase-requisition.datasource";
import { assertRequisitionCanBeDeleted } from "../src/domain/use-cases/requisition-deletion-rule";
import { PurchaseRequisitionUseCase } from "../src/domain/use-cases/purchase-requisition.use-case";
import type { PurchaseRequisitionRepository } from "../src/domain/repositories/purchase-requisition.repository";
import type { QuoteRepository } from "../src/domain/repositories/quote.repository";

const eligible = {
  confirmation: "REQ-123",
  requisitionNumber: "REQ-123",
  status: "SUBMITTED",
  erpOrderNumber: null,
  orderStatus: "NOT_GENERATED",
  hasOrderExport: false,
};

test("requisition deletion needs the exact folio and rejects exported ERP orders", () => {
  assert.doesNotThrow(() => assertRequisitionCanBeDeleted(eligible));
  assert.throws(() => assertRequisitionCanBeDeleted({ ...eligible, confirmation: "REQ-456" }), /confirmation/);
  assert.throws(() => assertRequisitionCanBeDeleted({ ...eligible, erpOrderNumber: "P021827" }), /ERP order/);
  assert.throws(() => assertRequisitionCanBeDeleted({ ...eligible, hasOrderExport: true }), /order file/);
  assert.throws(() => assertRequisitionCanBeDeleted({ ...eligible, status: "COMPLETED" }), /ERP order/);
});

test("only admin can delete a requisition and exclusive files are removed after repository deletion", async () => {
  const calls: string[] = [];
  const repository = {
    deletePermanently: async (_id: string, _confirmation: string, _actor: PurchaseRequisitionActor) => {
      calls.push("database");
      return { storageKeysToDelete: ["2026/10/offer.pdf"] };
    },
  } as unknown as PurchaseRequisitionRepository;
  const storage = {
    delete: async (key: string) => { calls.push(`file:${key}`); },
  } as FileStoragePort;
  const useCase = new PurchaseRequisitionUseCase(
    repository,
    {} as QuoteRepository,
    {} as LocalProductSemanticPort,
    {} as ErpProductLookupPort,
    {} as ErpSupplierLookupPort,
    storage,
  );
  const actor: PurchaseRequisitionActor = { id: "admin-1", branchId: "branch-1", role: "ADMIN" };
  await assert.rejects(
    useCase.deletePermanently("req-1", "REQ-123", { ...actor, role: "SELLER" }),
    /Only ADMIN/,
  );
  assert.deepEqual(calls, []);
  await useCase.deletePermanently("req-1", "REQ-123", actor);
  assert.deepEqual(calls, ["database", "file:2026/10/offer.pdf"]);
});
