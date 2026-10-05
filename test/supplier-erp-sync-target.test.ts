import assert from "node:assert/strict";
import test from "node:test";
import { resolveSupplierErpSyncTarget } from "../src/domain/use-cases/supplier-erp-sync-target";

test("links a local supplier that already owns the ERP tax ID", () => {
  const local = { id: "local-1", erpCode: null };
  assert.equal(resolveSupplierErpSyncTarget(null, [local]), local);
});

test("refreshes the supplier already linked to the ERP code", () => {
  const existing = { id: "erp-1", erpCode: "ERP-10" };
  assert.equal(resolveSupplierErpSyncTarget(existing, [existing]), existing);
});

test("creates another ERP supplier when its RFC belongs to a different ERP code", () => {
  const existing = { id: "erp-1", erpCode: "ERP-11" };
  assert.equal(resolveSupplierErpSyncTarget(null, [existing]), null);
});

test("does not replace a supplier already linked by ERP code with a local supplier", () => {
  const byCode = { id: "erp-1", erpCode: "ERP-10" };
  const local = { id: "local-1", erpCode: null };
  assert.equal(resolveSupplierErpSyncTarget(byCode, [local]), byCode);
});

test("prefers an unlinked local supplier among several ERP suppliers sharing the RFC", () => {
  const otherErp = { id: "erp-1", erpCode: "ERP-11" };
  const local = { id: "local-1", erpCode: null };
  assert.equal(resolveSupplierErpSyncTarget(null, [otherErp, local]), local);
});
