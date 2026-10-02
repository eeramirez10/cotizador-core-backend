import assert from "node:assert/strict";
import test from "node:test";
import { requisitionSubmissionError } from "../src/domain/use-cases/requisition-submission-rule";

const item = {
  quotationOwner: "PURCHASING" as const,
  sellerUnitCost: 0,
  sellerDeliveryTime: null,
  deliveryPlace: "VERACRUZ",
};

test("Purchasing can receive an item without a supplier cost or delivery time", () => {
  assert.equal(requisitionSubmissionError([item]), null);
});

test("Seller-managed items still need a positive supplier cost and delivery time", () => {
  assert.match(requisitionSubmissionError([{ ...item, quotationOwner: "SELLER" }]) || "", /positive cost/);
  assert.equal(requisitionSubmissionError([{ ...item, quotationOwner: "SELLER", sellerUnitCost: 100, sellerDeliveryTime: "2 DIAS" }]), null);
});

test("A mixed requisition requires a destination for every item", () => {
  assert.match(requisitionSubmissionError([item, { ...item, deliveryPlace: null }]) || "", /delivery destination/);
  assert.equal(requisitionSubmissionError([item, { ...item, quotationOwner: "SELLER", sellerUnitCost: 100, sellerDeliveryTime: "2 DIAS" }]), null);
});

test("Empty requisitions cannot be submitted", () => {
  assert.match(requisitionSubmissionError([]) || "", /at least one item/);
});
