import assert from "node:assert/strict";
import test from "node:test";
import { areSupplierRequisitionsReadyForOrder, groupRequisitionItemsBySupplier } from "../src/domain/use-cases/requisitions-per-supplier-rule";

test("groups only assigned quote items under their supplier", () => {
  const groups = groupRequisitionItemsBySupplier([
    { id: "1", sellerSupplierId: "supplier-a" },
    { id: "2", sellerSupplierId: "supplier-a" },
    { id: "3", sellerSupplierId: "supplier-b" },
    { id: "4", sellerSupplierId: "supplier-b" },
    { id: "5", sellerSupplierId: null },
  ]);
  assert.deepEqual([...groups.entries()].map(([supplierId, items]) => [supplierId, items.map((item) => item.id)]), [
    ["supplier-a", ["1", "2"]],
    ["supplier-b", ["3", "4"]],
  ]);
});

test("order waits for every supplier requisition and every required item", () => {
  const first = { status: "READY_FOR_ORDER", items: [{ quoteItemId: "1", status: "READY" }, { quoteItemId: "2", status: "READY" }] };
  const second = { status: "DRAFT", items: [{ quoteItemId: "3", status: "PENDING" }, { quoteItemId: "4", status: "PENDING" }] };
  assert.equal(areSupplierRequisitionsReadyForOrder(["1", "2", "3", "4"], [first, second], true), false);
  assert.equal(areSupplierRequisitionsReadyForOrder(["1", "2", "3", "4"], [first], true), false);
  assert.equal(areSupplierRequisitionsReadyForOrder(["1", "2", "3", "4"], [first, {
    status: "READY_FOR_ORDER", items: [{ quoteItemId: "3", status: "READY" }, { quoteItemId: "4", status: "READY" }],
  }], true), true);
});
