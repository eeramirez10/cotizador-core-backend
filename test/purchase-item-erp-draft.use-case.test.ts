import assert from "node:assert/strict";
import test from "node:test";
import { PurchaseItemErpDraftUseCase } from "../src/domain/use-cases/purchase-item-erp-draft.use-case";
import type { PurchaseRequisitionRepository } from "../src/domain/repositories/purchase-requisition.repository";
import type { PurchaseItemErpDraftRepository } from "../src/domain/repositories/purchase-item-erp-draft.repository";
import type { PurchaseRequisitionActor } from "../src/domain/datasources/purchase-requisition.datasource";

const actor: PurchaseRequisitionActor = { id: "buyer-1", role: "PURCHASING", branchId: "branch-1" };
const requisition = (status: string, source = "LOCAL_NEW") => ({
  id: "req-1", branchCode: "03", requestedByUserId: "seller-1", status,
  items: [{ id: "item-1", source, erpLinkedAt: null }],
});

test("ERP draft saves only local items without changing a requisition or Proscai", async () => {
  let saved: unknown;
  const useCase = new PurchaseItemErpDraftUseCase(
    { findById: async () => requisition("IN_PROGRESS") } as unknown as PurchaseRequisitionRepository,
    {
      findByItemId: async () => null,
      save: async (_id: string, data: unknown) => {
        saved = data;
        return { data, updatedAt: new Date("2026-10-22T12:00:00Z"), updatedByUserId: actor.id };
      },
    } as PurchaseItemErpDraftRepository,
  );
  const result = await useCase.save("req-1", "item-1", { description: "TUBO", productType: 1 }, actor);
  assert.deepEqual(saved, {
    description: "TUBO", productType: 1, primaryAccount: "1115003",
    secondaryAccount: "4001001", costAccount: "5001001", salesProfile: "V3", purchaseProfile: "CG",
  });
  assert.deepEqual(result.data, saved);
});

test("ERP draft enforces branch accounts, profiles and finished-product type on save", async () => {
  let saved: unknown;
  const useCase = new PurchaseItemErpDraftUseCase(
    { findById: async () => requisition("IN_PROGRESS") } as unknown as PurchaseRequisitionRepository,
    { save: async (_id: string, data: unknown) => {
      saved = data;
      return { data, updatedAt: new Date(), updatedByUserId: actor.id };
    } } as PurchaseItemErpDraftRepository,
  );
  await useCase.save("req-1", "item-1", { primaryAccount: "0000000", salesProfile: "VG", productType: 0 }, actor);
  assert.deepEqual(saved, {
    primaryAccount: "1115003", secondaryAccount: "4001001", costAccount: "5001001",
    salesProfile: "V3", purchaseProfile: "CG", productType: 1,
  });
});

test("ERP draft denies seller edits after submission and rejects ERP-backed items", async () => {
  const drafts = { findByItemId: async () => null, save: async () => { throw new Error("should not save"); } } as unknown as PurchaseItemErpDraftRepository;
  const seller: PurchaseRequisitionActor = { id: "seller-1", role: "SELLER", branchId: "branch-1" };
  const submitted = new PurchaseItemErpDraftUseCase({ findById: async () => requisition("SUBMITTED") } as unknown as PurchaseRequisitionRepository, drafts);
  await assert.rejects(submitted.save("req-1", "item-1", {}, seller), /No tienes permiso/);
  const erpItem = new PurchaseItemErpDraftUseCase({ findById: async () => requisition("DRAFT", "ERP_NO_STOCK") } as unknown as PurchaseRequisitionRepository, drafts);
  await assert.rejects(erpItem.get("req-1", "item-1", seller), /Partida local no encontrada/);
});
