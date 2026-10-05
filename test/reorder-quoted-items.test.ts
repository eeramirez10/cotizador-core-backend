import assert from "node:assert/strict";
import test from "node:test";
import { ReorderQuotedItemsRequestDto } from "../src/domain/dtos/request/reorder-quoted-items-request.dto";
import type { ReorderQuotedItemsDatasourceParams } from "../src/domain/datasources/quote.datasource";
import type { QuoteEntity } from "../src/domain/entities/quote.entity";
import { QuoteRepository } from "../src/domain/repositories/quote.repository";
import { ReorderQuotedItemsUseCase } from "../src/domain/use-cases/reorder-quoted-items.use-case";

const first = "11111111-1111-1111-1111-111111111111";
const second = "22222222-2222-2222-2222-222222222222";

test("reorder request accepts distinct ids and rejects missing, duplicate, or malformed ids", () => {
  assert.deepEqual(ReorderQuotedItemsRequestDto.create({ itemIds: [second, first] })[1]?.itemIds, [second, first]);
  assert.match(ReorderQuotedItemsRequestDto.create({ itemIds: [first, first] })[0] ?? "", /distinct/);
  assert.match(ReorderQuotedItemsRequestDto.create({ itemIds: [first] })[0] ?? "", /distinct/);
  assert.match(ReorderQuotedItemsRequestDto.create({ itemIds: [first, "bad-id"] })[0] ?? "", /distinct/);
});

test("reorder use case forwards seller scope without changing the quote", async () => {
  let received: ReorderQuotedItemsDatasourceParams | undefined;
  const repository = {
    reorderQuotedItems: async (params: ReorderQuotedItemsDatasourceParams) => {
      received = params;
      return { id: "quote-1" } as QuoteEntity;
    },
  } as QuoteRepository;
  const dto = ReorderQuotedItemsRequestDto.create({ itemIds: [second, first] })[1]!;
  await new ReorderQuotedItemsUseCase(repository).execute("quote-1", dto, {
    id: "seller-1", role: "SELLER", branchId: "branch-1",
  });
  assert.deepEqual(received, {
    id: "quote-1",
    itemIds: [second, first],
    actorUserId: "seller-1",
    scope: { role: "SELLER", userId: "seller-1", branchId: "branch-1" },
  });
});
