import assert from "node:assert/strict";
import test from "node:test";
import type { ReviewQuoteSalePricesDatasourceParams } from "../src/domain/datasources/quote.datasource";
import { QuoteRepository } from "../src/domain/repositories/quote.repository";
import { ReviewQuoteSalePricesUseCase } from "../src/domain/use-cases/review-quote-sale-prices.use-case";

const seller = { id: "seller", role: "SELLER" as const, branchId: "branch" };

test("seller reviews a price separately from the purchasing cost", async () => {
  let saved: ReviewQuoteSalePricesDatasourceParams | null = null;
  const quotes = { reviewSalePrices: async (params: ReviewQuoteSalePricesDatasourceParams) => {
    saved = params;
    return { items: [], events: [] };
  } } as unknown as QuoteRepository;
  await new ReviewQuoteSalePricesUseCase(quotes).execute("quote", {
    items: [{ itemId: "item", expectedUnitCost: 120, unitPrice: 165 }],
  }, seller);
  assert.deepEqual(saved?.items, [{ itemId: "item", expectedUnitCost: 120, unitPrice: 165 }]);
  assert.equal(saved?.scope.userId, "seller");
});

test("price review rejects non-sellers and malformed prices", async () => {
  const useCase = new ReviewQuoteSalePricesUseCase({} as QuoteRepository);
  await assert.rejects(useCase.execute("quote", { items: [] }, { ...seller, role: "PURCHASING" }), /Solo el vendedor/);
  await assert.rejects(useCase.execute("quote", { items: [null] }, seller), /válidos/);
  await assert.rejects(useCase.execute("quote", { items: [{ itemId: "item", expectedUnitCost: 120, unitPrice: 0 }] }, seller), /válidos/);
});
