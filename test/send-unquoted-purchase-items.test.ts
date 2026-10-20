import assert from "node:assert/strict";
import test from "node:test";
import { SendUnquotedRequisitionRequestDto } from "../src/domain/dtos/request/purchase-requisition-request.dto";
import { erpCodeForQuoteItem, quotationOwnerForSupplierReference, selectUnquotedPurchaseItems } from "../src/domain/use-cases/select-unquoted-purchase-items";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const buyerId = "33333333-3333-4333-8333-333333333333";

const candidate = (id: string, overrides: Partial<{
  stock: number;
  externalProductCode: string;
  sellerSupplierId: string;
}> = {}) => ({
  id,
  qty: 10,
  stock: overrides.stock ?? 0,
  externalProductCode: overrides.externalProductCode ?? null,
  product: null,
  sellerSupplierId: overrides.sellerSupplierId ?? null,
});

test("selects only requested purchase items in quote order with their purchase quantity", () => {
  const result = selectUnquotedPurchaseItems([
    candidate(firstId, { stock: 4, externalProductCode: "ERP-1" }),
    candidate(secondId),
  ], [secondId, firstId]);
  assert.deepEqual(result.map(({ item, position, purchaseQty }) => [item.id, position, purchaseQty]), [
    [firstId, 1, 6], [secondId, 2, 10],
  ]);
});

test("keeps coded local products separate from ERP products with partial stock", () => {
  const local = { ...candidate(firstId), product: { code: "LOCAL-42", source: "LOCAL_TEMP" as const } };
  const erp = { ...candidate(secondId, { stock: 4 }), product: { code: "ERP-42", source: "ERP" as const } };
  const result = selectUnquotedPurchaseItems([local, erp], [firstId, secondId]);
  assert.deepEqual(result.map(({ erpCode, purchaseQty }) => [erpCode, purchaseQty]), [["", 10], ["ERP-42", 6]]);
  assert.equal(erpCodeForQuoteItem(local), "");
});

test("rejects unavailable, already-sourced and duplicate items", () => {
  assert.throws(() => selectUnquotedPurchaseItems([candidate(firstId)], [secondId]), /no pertenecen/);
  assert.throws(() => selectUnquotedPurchaseItems([candidate(firstId)], [firstId, firstId]), /repetidas/);
  assert.throws(() => selectUnquotedPurchaseItems([candidate(firstId, { stock: 10, externalProductCode: "ERP-1" })], [firstId]), /no requiere compra/);
  assert.throws(() => selectUnquotedPurchaseItems([candidate(firstId, { sellerSupplierId: buyerId })], [firstId]), /proveedor de Ventas/);
});

test("validates direct-send payload before touching the database", () => {
  const [error, dto] = SendUnquotedRequisitionRequestDto.create({ itemIds: [firstId], buyerUserId: buyerId });
  assert.equal(error, undefined);
  assert.deepEqual(dto?.itemIds, [firstId]);
  assert.match(SendUnquotedRequisitionRequestDto.create({ itemIds: [firstId, firstId], buyerUserId: buyerId })[0] || "", /duplicadas/);
  assert.match(SendUnquotedRequisitionRequestDto.create({ itemIds: ["partida-local"], buyerUserId: buyerId })[0] || "", /identificador válido/);
  const manyIds = Array.from({ length: 101 }, (_, index) => `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`);
  assert.equal(SendUnquotedRequisitionRequestDto.create({ itemIds: manyIds, buyerUserId: buyerId })[0], undefined);
  assert.match(SendUnquotedRequisitionRequestDto.create({ itemIds: Array.from({ length: 501 }, (_, index) => `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`), buyerUserId: buyerId })[0] || "", /máximo de 500/);
  assert.ok(SendUnquotedRequisitionRequestDto.create({ itemIds: [firstId], buyerUserId: "invalid" })[0]);
});

test("assigns quoting responsibility from the creation path", () => {
  assert.equal(quotationOwnerForSupplierReference(null), "PURCHASING");
  assert.equal(quotationOwnerForSupplierReference(buyerId), "SELLER");
});
