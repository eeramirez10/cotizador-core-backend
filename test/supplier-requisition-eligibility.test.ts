import assert from "node:assert/strict";
import test from "node:test";
import { canIssueSupplierRequisitions } from "../src/domain/use-cases/supplier-requisition-eligibility";
import { evaluateQuoteOrderItems } from "../src/domain/use-cases/quote-order-eligibility";

const local = { source: "LOCAL_NEW" as const, erpCode: null, status: "PENDING_ERP_CODE" };
const erp = { source: "ERP_NO_STOCK" as const, erpCode: "03-123", status: "READY" };

test("local purchase documents require the switch and an accepted quote workflow", () => {
  assert.equal(canIssueSupplierRequisitions("PARTIALLY_QUOTED", [local], false), false);
  assert.equal(canIssueSupplierRequisitions("PARTIALLY_QUOTED", [local], true), true);
  assert.equal(canIssueSupplierRequisitions("DRAFT", [local], true), false);
  assert.equal(canIssueSupplierRequisitions("COST_REVIEW", [local], true), false);
});

test("mixed ERP and local items can be purchased when the local switch is enabled", () => {
  assert.equal(canIssueSupplierRequisitions("PARTIALLY_QUOTED", [erp, local], true), true);
  assert.equal(canIssueSupplierRequisitions("PARTIALLY_QUOTED", [erp, local], false), false);
  assert.equal(canIssueSupplierRequisitions("READY_FOR_ORDER", [erp], false), true);
});

test("the switch does not bypass unquoted or ERP-pending items", () => {
  assert.equal(canIssueSupplierRequisitions("PARTIALLY_QUOTED", [{ ...local, status: "QUOTING" }], true), false);
  assert.equal(canIssueSupplierRequisitions("PARTIALLY_QUOTED", [{ ...erp, status: "PENDING_ERP_CODE" }], true), false);
  assert.equal(canIssueSupplierRequisitions("PARTIALLY_QUOTED", [], true), false);
});

test("supplier documents never make an unlinked local item valid for the ERP TXT", () => {
  assert.equal(canIssueSupplierRequisitions("PARTIALLY_QUOTED", [local], true), true);
  assert.equal(evaluateQuoteOrderItems([{ externalProductCode: null, product: null, qty: 1, stock: 0 }], true).missingErpCode, true);
});
