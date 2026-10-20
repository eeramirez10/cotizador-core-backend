import assert from "node:assert/strict";
import test from "node:test";
import { CreatePurchaseSupplierOffersBatchRequestDto, UpdatePurchaseSupplierOffersBatchRequestDto } from "../src/domain/dtos/request/purchase-requisition-request.dto";

const offer = (itemId: string, overrides: Record<string, unknown> = {}) => ({
  itemId,
  supplierId: "supplier-1",
  qty: 2,
  unitCost: 125,
  currency: "MXN",
  origin: "MEXICO",
  deliveryTime: "3-5 DIAS",
  quoteDate: "2026-10-19",
  ...overrides,
});

test("supplier offers require origin, delivery time and a valid currency", () => {
  assert.match(CreatePurchaseSupplierOffersBatchRequestDto.create({ offers: [offer("item-1", { origin: "" })] })[0] || "", /origin is required/);
  assert.match(CreatePurchaseSupplierOffersBatchRequestDto.create({ offers: [offer("item-1", { deliveryTime: "" })] })[0] || "", /deliveryTime is required/);
  assert.match(CreatePurchaseSupplierOffersBatchRequestDto.create({ offers: [offer("item-1", { currency: "" })] })[0] || "", /currency is invalid/);
});

test("accepts distinct items from one supplier and currency", () => {
  const [error, dto] = CreatePurchaseSupplierOffersBatchRequestDto.create({ offers: [offer("item-1"), offer("item-2")] });
  assert.equal(error, undefined);
  assert.deepEqual(dto?.offers.map((row) => row.itemId), ["item-1", "item-2"]);
});

test("rejects duplicate items and mixed suppliers or currencies", () => {
  assert.match(CreatePurchaseSupplierOffersBatchRequestDto.create({ offers: [offer("item-1"), offer("item-1")] })[0] || "", /repitas/);
  assert.match(CreatePurchaseSupplierOffersBatchRequestDto.create({ offers: [offer("item-1"), offer("item-2", { supplierId: "supplier-2" })] })[0] || "", /mismo proveedor/);
  assert.match(CreatePurchaseSupplierOffersBatchRequestDto.create({ offers: [offer("item-1"), offer("item-2", { currency: "USD", exchangeRate: 18.5 })] })[0] || "", /sola moneda/);
});

test("rejects an invalid line without saving a partial batch", () => {
  assert.match(CreatePurchaseSupplierOffersBatchRequestDto.create({ offers: [offer("item-1"), offer("item-2", { unitCost: -1 })] })[0] || "", /Partida 2/);
  assert.match(CreatePurchaseSupplierOffersBatchRequestDto.create({ offers: [offer("item-1"), offer("item-2", { externalReference: "OTHER" })] })[0] || "", /datos generales/);
});

test("retains delivery state and technical edits for each selected line", () => {
  const [error, dto] = CreatePurchaseSupplierOffersBatchRequestDto.create({
    deliveryState: "VERACRUZ",
    offers: [offer("item-1", {
      itemDetails: {
        standard: "ASTM A106", diameter: "2 IN", thickness: "SCH 40", bore: "",
        technicalFamily: "PIPE", technicalAttributes: { GRADE: "B" },
        originRestrictions: ["NACIONAL", "NACIONAL"],
      },
    })],
  });
  assert.equal(error, undefined);
  assert.equal(dto?.deliveryState, "VERACRUZ");
  assert.equal(dto?.offers[0].itemDetails?.standard, "ASTM A106");
  assert.deepEqual(dto?.offers[0].itemDetails?.technicalAttributes, { GRADE: "B" });
  assert.deepEqual(dto?.offers[0].itemDetails?.originRestrictions, ["NACIONAL"]);
});

test("rejects malformed technical restrictions in a batch line", () => {
  const [error] = CreatePurchaseSupplierOffersBatchRequestDto.create({
    offers: [offer("item-1", { itemDetails: { originRestrictions: "NACIONAL" } })],
  });
  assert.match(error || "", /Partida 1: originRestrictions must be a string array/);
});

test("edits existing offers and accepts a new line for the same supplier", () => {
  const [error, dto] = UpdatePurchaseSupplierOffersBatchRequestDto.create({
    deliveryState: "VERACRUZ",
    offers: [offer("item-1", { offerId: "offer-1", unitCost: 140 }), offer("item-2")],
  });
  assert.equal(error, undefined);
  assert.equal(dto?.deliveryState, "VERACRUZ");
  assert.deepEqual(dto?.offers.map((row) => row.offerId), ["offer-1", null]);
  assert.deepEqual(dto?.offers.map((row) => row.offer.unitCost), [140, 125]);
});

test("rejects duplicated or malformed offer ids when editing", () => {
  assert.match(UpdatePurchaseSupplierOffersBatchRequestDto.create({
    offers: [offer("item-1", { offerId: "offer-1" }), offer("item-2", { offerId: "offer-1" })],
  })[0] || "", /No repitas propuestas/);
  assert.match(UpdatePurchaseSupplierOffersBatchRequestDto.create({
    offers: [offer("item-1", { offerId: "" })],
  })[0] || "", /offerId no es válido/);
  assert.match(UpdatePurchaseSupplierOffersBatchRequestDto.create({
    offers: [offer("item-1", { offerId: "offer-1" }), offer("item-2", { supplierId: "otro" })],
  })[0] || "", /mismo proveedor/);
});
