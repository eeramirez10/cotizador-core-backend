import assert from "node:assert/strict";
import test from "node:test";
import { CreateQuoteRequestDto } from "../src/domain/dtos/request/create-quote-request.dto";
import { UpdateQuoteRequestDto } from "../src/domain/dtos/request/update-quote-request.dto";
import { SaveQuoteDraftRequestDto } from "../src/domain/dtos/request/save-quote-draft-request.dto";
import { CreateLocalTempProductRequestDto } from "../src/domain/dtos/request/create-local-temp-product-request.dto";
import { CreateLocalProductsFromItemsRequestDto } from "../src/domain/dtos/request/create-local-products-from-items-request.dto";
import { SearchSimilarLocalProductsRequestDto } from "../src/domain/dtos/request/search-similar-local-products-request.dto";
import { UpsertQuoteCatalogOptionRequestDto } from "../src/domain/dtos/request/upsert-quote-catalog-option-request.dto";
import { QuoteCatalogOptionsUseCase } from "../src/domain/use-cases/quote-catalog-options.use-case";
import { CreateLocalProductsFromItemsUseCase } from "../src/domain/use-cases/create-local-products-from-items.use-case";
import type { QuoteCatalogRepository } from "../src/domain/repositories/quote-catalog.repository";
import type { ProductRepository } from "../src/domain/repositories/product.repository";
import type { BranchRepository } from "../src/domain/repositories/branch.repository";
import type { LocalProductSemanticPort } from "../src/domain/contracts/local-product-semantic.port";

const quote = {
  customerId: "customer-1", currency: "MXN", exchangeRate: 17,
  exchangeRateDate: "2026-11-13", taxRate: 0.16,
  paymentTerms: "CONTADO", validityDays: 10,
};
test("quote references are trimmed, optional, bounded and clearable on both update paths", () => {
  assert.equal(CreateQuoteRequestDto.create({ ...quote, customerReference: "  RFQ-005/á " })[1]?.customerReference, "RFQ-005/á");
  assert.equal(CreateQuoteRequestDto.create({ ...quote, customerReference: "A".repeat(120) })[1]?.customerReference?.length, 120);
  for (const value of [3, "A".repeat(121), "A\nB"]) {
    assert.match(CreateQuoteRequestDto.create({ ...quote, customerReference: value })[0]!, /referencia/);
  }
  assert.equal(UpdateQuoteRequestDto.create({ paymentTerms: "CONTADO" })[1]?.customerReference, undefined);
  assert.equal(UpdateQuoteRequestDto.create({ customerReference: "" })[1]?.customerReference, null);
  const draft = { ...quote, action: "SAVE_DRAFT", items: [] };
  assert.equal(SaveQuoteDraftRequestDto.create(draft)[1]?.quote.customerReference, undefined);
  assert.equal(SaveQuoteDraftRequestDto.create({ ...draft, customerReference: " " })[1]?.quote.customerReference, null);
  assert.equal(SaveQuoteDraftRequestDto.create({ ...draft, customerReference: "REQ-123" })[1]?.quote.customerReference, "REQ-123");
});

test("local product and dedup requests normalize TON and preserve custom codes", () => {
  for (const [unit, expected] of [["Toneladas", "TON"], [" ton ", "TON"], ["caj20", "CAJ20"]]) {
    const input = { description: "Tubo de acero", unit };
    assert.equal(CreateLocalTempProductRequestDto.create(input)[1]?.unit, expected);
    assert.equal(SearchSimilarLocalProductsRequestDto.create(input)[1]?.unit, expected);
  }
  assert.ok(SearchSimilarLocalProductsRequestDto.create({ description: "Tubo", unit: "?" })[0]);
  assert.ok(CreateLocalTempProductRequestDto.create({ description: "Tubo", unit: "caja 20" })[0]);
});

test("batch rejects an inactive/unknown unit before creating or matching any products", async () => {
  const [error, input] = CreateLocalProductsFromItemsRequestDto.create({ items: [
    { itemId: "a", description: "Tubo", unit: "tonelada" },
    { itemId: "b", description: "Brida", unit: "CAJ20" },
  ] });
  assert.equal(error, undefined);
  const useCase = new CreateLocalProductsFromItemsUseCase({
    findActiveLocalTempByDescriptionAndUnit: async () => assert.fail("must validate all units before writes"),
  } as unknown as ProductRepository, {} as BranchRepository, {} as LocalProductSemanticPort, {
    listAvailable: async (_branch, type) => {
      assert.equal(type, "MEASUREMENT_UNIT");
      return [{ code: "TON" }] as Awaited<ReturnType<QuoteCatalogRepository["listAvailable"]>>;
    },
  });
  await assert.rejects(useCase.execute(input!, { id: "seller", role: "SELLER", branchId: "branch" }), /CAJ20.*no está activa/);
});

test("measurement units are global, reject alias codes, and require ADMIN for writes", async () => {
  const [error, dto] = UpsertQuoteCatalogOptionRequestDto.create({
    type: "MEASUREMENT_UNIT", code: " caj20 ", label: "Caja de 20", branchId: "untrusted",
  }, { allowBranchId: true, allowCode: true });
  assert.equal(error, undefined);
  assert.equal(dto?.branchId, null);
  assert.equal(dto?.code, "CAJ20");
  const useCase = new QuoteCatalogOptionsUseCase({
    findById: async () => ({ type: "MEASUREMENT_UNIT", code: "CAJ20" }),
    existsInScope: async () => true,
  } as unknown as QuoteCatalogRepository);
  for (const role of ["MANAGER", "PURCHASING", "SELLER"] as const) {
    const actor = { role, branchId: "branch" };
    await assert.rejects(useCase.create(dto!, actor), /Solo un administrador/);
    await assert.rejects(useCase.update("unit", dto!, actor), /Solo un administrador/);
    await assert.rejects(useCase.deactivate("unit", actor), /Solo un administrador/);
  }
  const admin = { role: "ADMIN" as const, branchId: "branch" };
  await assert.rejects(useCase.create(dto!, admin), /already exists/);
  const [, alias] = UpsertQuoteCatalogOptionRequestDto.create({ type: "MEASUREMENT_UNIT", code: "KG", label: "Kg" });
  await assert.rejects(useCase.create(alias!, admin), /ya corresponde a la unidad K/);
});
