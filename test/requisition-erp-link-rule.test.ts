import assert from "node:assert/strict";
import test from "node:test";
import { assertRequisitionErpLinkAllowed, erpUnitsMatch } from "../src/domain/use-cases/requisition-erp-link-rule";
import { erpDraftDefaultsFromOffer, mergeSelectedOfferIntoErpDraft } from "../src/domain/use-cases/purchase-item-erp-draft.defaults";

const ready = {
  quoteStatus: "APPROVED", requisitionStatus: "PARTIALLY_QUOTED", itemStatus: "PENDING_ERP_CODE",
  source: "LOCAL_NEW", erpCode: null, issued: false,
};

test("requires current approval and an open local requisition item", () => {
  assert.doesNotThrow(() => assertRequisitionErpLinkAllowed(ready));
  for (const changes of [{ quoteStatus: "QUOTED" }, { quoteLocked: true }, { requisitionStatus: "COMPLETED" },
    { itemStatus: "CANCELLED" }, { source: "ERP_NO_STOCK" }]) {
    assert.throws(() => assertRequisitionErpLinkAllowed({ ...ready, ...changes }));
  }
});

test("after issuance, only the first missing code can be confirmed", () => {
  assert.doesNotThrow(() => assertRequisitionErpLinkAllowed({ ...ready, issued: true, issuedLineCodes: [null] }));
  assert.throws(() => assertRequisitionErpLinkAllowed({ ...ready, issued: true, erpCode: "01000001" }), /ya fue emitido/);
  assert.throws(() => assertRequisitionErpLinkAllowed({ ...ready, issued: true, issuedLineCodes: ["01000001"] }), /ya fue emitido/);
});

test("unit comparison accepts aliases and custom exact codes but not conversions", () => {
  assert.ok(erpUnitsMatch("pieza", "PZ"));
  assert.ok(erpUnitsMatch(" ton ", "Toneladas"));
  assert.ok(erpUnitsMatch("abc", "ABC"));
  assert.ok(!erpUnitsMatch("TON", "KG"));
  assert.ok(!erpUnitsMatch("", ""));
});

test("suggestions use local descriptions and technical data without replacing reviewed text", () => {
  const item = { description: "Tubo", customerDescription: "Tubo solicitado", productDescription: "Tubo sin costura",
    technicalAttributes: { standard: "ASTM A106" }, unit: "M", erpEan: null };
  const offer = { currency: "USD" } as const;
  const defaults = erpDraftDefaultsFromOffer(item, offer);
  assert.equal(defaults.description, "Tubo sin costura");
  assert.match(defaults.extendedDescription!, /Tubo solicitado[\s\S]*ASTM A106/);
  assert.equal(mergeSelectedOfferIntoErpDraft(item, offer, { extendedDescription: "Revisada" }).extendedDescription, "Revisada");
});
