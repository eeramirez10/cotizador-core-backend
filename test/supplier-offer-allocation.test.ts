import assert from "node:assert/strict";
import test from "node:test";
import { supplierRequisitionGroupKey, validateSupplierOfferAllocations } from "../src/domain/use-cases/supplier-offer-allocation";

const offers = [
  { id: "a", qty: 10, isActive: true, minimumQty: null },
  { id: "b", qty: 5, isActive: true, minimumQty: 2 },
];

test("allows exact quantity split across suppliers", () => {
  assert.doesNotThrow(() => validateSupplierOfferAllocations(10, [{ offerId: "a", qty: 7 }, { offerId: "b", qty: 3 }], offers));
});

test("rejects incomplete, excessive, duplicate and minimum-breaking awards", () => {
  assert.throws(() => validateSupplierOfferAllocations(10, [{ offerId: "a", qty: 7 }], offers));
  assert.throws(() => validateSupplierOfferAllocations(10, [{ offerId: "a", qty: 4 }, { offerId: "b", qty: 6 }], offers));
  assert.throws(() => validateSupplierOfferAllocations(10, [{ offerId: "a", qty: 7 }, { offerId: "a", qty: 3 }], offers));
  assert.throws(() => validateSupplierOfferAllocations(10, [{ offerId: "a", qty: 9 }, { offerId: "b", qty: 1 }], offers));
});

test("keeps purchase documents separate by supplier and currency", () => {
  assert.notEqual(supplierRequisitionGroupKey("supplier-a", "MXN"), supplierRequisitionGroupKey("supplier-a", "USD"));
  assert.notEqual(supplierRequisitionGroupKey("supplier-a", "USD"), supplierRequisitionGroupKey("supplier-b", "USD"));
});
