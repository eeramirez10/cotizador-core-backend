import assert from "node:assert/strict";
import test from "node:test";
import { canRequestPurchasingPrices, hasPendingPurchasingPrices, isPurchasingPriceReady, resolvePurchasePriceAwards } from "../src/domain/use-cases/purchase-price-inquiry-rule";

test("a manual draft can request purchasing prices before customer approval", () => {
  assert.equal(canRequestPurchasingPrices("DRAFT", "SYSTEM"), true);
  assert.equal(canRequestPurchasingPrices("APPROVED", "SYSTEM"), true);
  assert.equal(canRequestPurchasingPrices("DRAFT", "EXCEL_IMPORT"), false);
  assert.equal(canRequestPurchasingPrices("CANCELLED", "SYSTEM"), false);
});

test("purchasing prices are ready only after every requested quantity has an awarded offer", () => {
  const quoted = { qty: 4, offers: [{ isSelected: true, awardedQty: 4 }] };
  assert.equal(isPurchasingPriceReady([quoted, { qty: 2, offers: [] }]), false);
  assert.equal(isPurchasingPriceReady([quoted, { qty: 2, offers: [{ isSelected: true, awardedQty: 1 }] }]), false);
  assert.equal(isPurchasingPriceReady([quoted, { qty: 2, offers: [{ isSelected: true, awardedQty: 2 }] }]), true);
  assert.equal(hasPendingPurchasingPrices([{ status: "SUBMITTED", items: [quoted, { qty: 2, offers: [] }] }]), true);
  assert.equal(hasPendingPurchasingPrices([{ status: "READY_FOR_ORDER", items: [quoted] }]), false);
  assert.equal(hasPendingPurchasingPrices([{ status: "CANCELLED", items: [{ qty: 2, offers: [] }] }]), false);
  assert.equal(hasPendingPurchasingPrices([{ status: "SUBMITTED", items: [{ qty: 2, offers: [], status: "CANCELLED" }] }]), false);
});

test("finalization auto-selects a sole offer, but never chooses among suppliers", () => {
  const offer = { id: "supplier-1", qty: 4, minimumQty: null, isActive: true, isSelected: false, awardedQty: null };
  assert.deepEqual(resolvePurchasePriceAwards(1, 4, [offer]), {
    awards: [{ offer, qty: 4 }], autoSelected: true,
  });
  assert.throws(() => resolvePurchasePriceAwards(2, 4, [offer, { ...offer, id: "supplier-2" }]), /Selecciona una propuesta/);
  assert.throws(() => resolvePurchasePriceAwards(3, 4, []), /Selecciona una propuesta/);
});

test("finalization requires full quantities and preserves manually split awards", () => {
  const first = { id: "supplier-1", qty: 4, minimumQty: null, isActive: true, isSelected: true, awardedQty: 2 };
  const second = { ...first, id: "supplier-2" };
  assert.deepEqual(resolvePurchasePriceAwards(1, 4, [first, second]).awards.map(({ offer, qty }) => [offer.id, qty]), [
    ["supplier-1", 2], ["supplier-2", 2],
  ]);
  assert.throws(() => resolvePurchasePriceAwards(1, 4, [first]), /equal the requisition item quantity/);
  assert.throws(() => resolvePurchasePriceAwards(1, 4, [{ ...first, isSelected: false, qty: 3 }]), /exceeds the supplier offer quantity/);
});
