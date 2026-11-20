import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { CreateQuoteItemRequestDto } from "../src/domain/dtos/request/create-quote-item-request.dto";
import { UpdateQuoteItemRequestDto } from "../src/domain/dtos/request/update-quote-item-request.dto";
import { SaveQuoteDraftRequestDto } from "../src/domain/dtos/request/save-quote-draft-request.dto";
import { MatchQuoteItemErpRequestDto } from "../src/domain/dtos/request/match-quote-item-erp-request.dto";
import { UpdateQuoteProcurementReferenceRequestDto } from "../src/domain/dtos/request/update-quote-procurement-reference-request.dto";
import { quoteItemShortTextFields, validateQuoteItemTextFields, QuoteItemTextValidationError } from "../src/domain/utils/quote-item-text-fields";
import { QuotesController } from "../src/presentation/quotes/quotes.controller";
import type { Request, Response } from "express";

const item = { clientItemId: "line-1", unit: "PZ", qty: 1, cost: 0, costCurrency: "MXN", unitPrice: 100 };
const draft = {
  customerId: "customer-1", currency: "USD", exchangeRate: 19, exchangeRateDate: "2026-11-20",
  taxRate: 0.16, paymentTerms: "CONTADO", validityDays: 10, action: "SAVE_DRAFT", items: [item],
};

test("draft creation and item edits preserve descriptions longer than 500 characters", () => {
  const fields = {
    customerDescription: "A".repeat(518), customerDescriptionOriginal: "B".repeat(552),
    erpDescription: "C".repeat(1400), sellerSupplierDescription: "D".repeat(1800),
  };
  const [error, dto] = SaveQuoteDraftRequestDto.create({ ...draft, items: [{ ...item, ...fields }] });
  assert.equal(error, undefined);
  for (const [field, value] of Object.entries(fields)) assert.equal(dto!.items[0][field as keyof typeof fields], value);
  assert.equal(UpdateQuoteItemRequestDto.create(fields)[1]?.customerDescription, fields.customerDescription);
  const [, matched] = MatchQuoteItemErpRequestDto.create({ ...item, externalProductCode: "01001", erpDescription: fields.erpDescription });
  assert.equal(matched?.erpDescription, fields.erpDescription);
});

test("every short text field is bounded before Prisma with its name and actual length", () => {
  for (const [field, [limit]] of Object.entries(quoteItemShortTextFields)) {
    assert.equal(validateQuoteItemTextFields({ [field]: ` ${"A".repeat(limit)} ` }), undefined);
    const error = validateQuoteItemTextFields({ [field]: "A".repeat(limit + 1) });
    assert.ok(error?.includes(field));
    assert.ok(error?.includes(String(limit + 1)));
    assert.ok(CreateQuoteItemRequestDto.create({ ...item, [field]: "A".repeat(limit + 1) })[0]);
    assert.ok(UpdateQuoteItemRequestDto.create({ [field]: "A".repeat(limit + 1) })[0]);
  }
  assert.equal(validateQuoteItemTextFields({ unit: "😀".repeat(30) }), undefined);
  assert.ok(validateQuoteItemTextFields({ unit: "😀".repeat(31) }));
  assert.ok(validateQuoteItemTextFields({ sellerSupplierProductCode: "ß".repeat(61) }));
});

test("draft errors identify the one-based item number without exposing its contents", () => {
  const [error] = SaveQuoteDraftRequestDto.create({ ...draft, items: [item, { ...item, clientItemId: "line-2", ean: "X".repeat(121) }] });
  assert.match(error!, /^Partida 2: EAN \(ean\).*120.*121/);
  assert.ok(!error!.includes("XXXXX"));
  assert.match(UpdateQuoteProcurementReferenceRequestDto.create({ sellerSupplierName: "S".repeat(221) })[0]!, /sellerSupplierNameSnapshot.*220.*221/);
});

test("text limits match all bounded QuoteItem strings and downstream descriptions use TEXT", () => {
  const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const block = schema.match(/model QuoteItem \{([\s\S]*?)\n\}/)![1];
  for (const match of block.matchAll(/^\s+(\w+)\s+String\??[^\n]*?@db\.VarChar\((\d+)\)/gm)) {
    assert.equal(quoteItemShortTextFields[match[1] as keyof typeof quoteItemShortTextFields]?.[0], Number(match[2]), match[1]);
  }
  for (const [model, fields] of Object.entries({
    QuoteItem: ["customerDescription", "customerDescriptionOriginal", "erpDescription", "sellerSupplierDescription"],
    PurchaseRequisitionItem: ["description"], PurchaseSupplierOffer: ["supplierDescription"], PurchaseSupplierRequisitionLine: ["description"],
  })) {
    const section = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))![1];
    for (const field of fields) assert.match(section, new RegExp(`\\n +${field} +String\\??[^\\n]*@db\\.Text`));
  }
});

test("draft validation and defensive persistence errors return HTTP 400 suitable for a toast", async () => {
  const req = { user: { id: "seller", role: "SELLER", branchId: "branch" }, params: { clientDraftId: "draft-1" },
    body: { ...draft, items: [{ ...item, deliveryTime: "X".repeat(81) }] } } as unknown as Request;
  let status = 0;
  let payload: { error: string } | undefined;
  const res = { status: (value: number) => { status = value; return res; }, json: (value: { error: string }) => { payload = value; return res; } } as unknown as Response;
  const Constructor = QuotesController as unknown as new (...args: unknown[]) => QuotesController;
  const endpoint = new Constructor(undefined, { execute: async () => { throw new QuoteItemTextValidationError("Partida 1: EAN (ean) admite hasta 120 caracteres."); } });
  await endpoint.saveDraft(req, res);
  assert.equal(status, 400);
  assert.match(payload!.error, /^Partida 1:.*deliveryTime.*80.*81/);
  req.body = draft;
  await endpoint.saveDraft(req, res);
  assert.equal(status, 400);
  assert.match(payload!.error, /^Partida 1: EAN/);
});
