import assert from "node:assert/strict";
import test from "node:test";
import { assertSameQuoteItemIds, assignQuoteItemPositions } from "../src/infrastructure/datasources/quote-item-positions";

test("new quote items retain their insertion order", () => {
  assert.deepEqual(assignQuoteItemPositions([], [
    { clientItemId: "first" },
    { clientItemId: "second" },
    { clientItemId: "third" },
  ]).map((item) => item.position), [1, 2, 3]);
});

test("editing or changing status does not reorder existing quote items", () => {
  const existing = [
    { clientItemId: "first", position: 1 },
    { clientItemId: "second", position: 2 },
  ];
  const result = assignQuoteItemPositions(existing, [
    { clientItemId: "second", status: "UPDATED" },
    { clientItemId: "new", status: "NEW" },
    { clientItemId: "first", status: "UNCHANGED" },
  ]);

  assert.deepEqual(result.map(({ clientItemId, position }) => [clientItemId, position]), [
    ["second", 2],
    ["new", 3],
    ["first", 1],
  ]);
  assert.deepEqual(existing.map((item) => item.position), [1, 2]);
});

test("new items append after the last position even when an earlier item was removed", () => {
  const result = assignQuoteItemPositions([
    { clientItemId: "first", position: 1 },
    { clientItemId: "removed", position: 2 },
    { clientItemId: "third", position: 3 },
  ], [
    { clientItemId: "third" },
    { clientItemId: "new" },
  ]);
  assert.deepEqual(result.map((item) => item.position), [3, 4]);
});

test("an explicit reorder replaces old positions with the requested sequence", () => {
  const result = assignQuoteItemPositions([
    { clientItemId: "first", position: 1 },
    { clientItemId: "second", position: 2 },
  ], [
    { clientItemId: "second" },
    { clientItemId: "new" },
    { clientItemId: "first" },
  ], true);

  assert.deepEqual(result.map(({ clientItemId, position }) => [clientItemId, position]), [
    ["second", 1],
    ["new", 2],
    ["first", 3],
  ]);
});

test("quoted reorder requires exactly the original item ids", () => {
  assert.doesNotThrow(() => assertSameQuoteItemIds(["a", "b"], ["b", "a"]));
  assert.throws(() => assertSameQuoteItemIds(["a", "b"], ["a", "a"]), /Item list changed/);
  assert.throws(() => assertSameQuoteItemIds(["a", "b"], ["a", "c"]), /Item list changed/);
  assert.throws(() => assertSameQuoteItemIds(["a", "b"], ["a"]), /Item list changed/);
});
