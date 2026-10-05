type PositionedItem = { clientItemId: string | null; position: number };

export const assertSameQuoteItemIds = (existingIds: readonly string[], requestedIds: readonly string[]): void => {
  if (existingIds.length !== requestedIds.length
    || new Set(requestedIds).size !== requestedIds.length
    || existingIds.some((id) => !requestedIds.includes(id))) {
    throw new Error("Item list changed. Refresh the quote and try again.");
  }
};

export const assignQuoteItemPositions = <T extends { clientItemId: string }>(
  existing: readonly PositionedItem[],
  items: readonly T[],
  reorder = false,
): Array<T & { position: number }> => {
  if (reorder) return items.map((item, index) => ({ ...item, position: index + 1 }));

  const positionsByClientId = new Map(
    existing.filter((item) => item.clientItemId !== null).map((item) => [item.clientItemId, item.position]),
  );
  let nextPosition = Math.max(0, ...existing.map((item) => item.position)) + 1;

  return items.map((item) => ({
    ...item,
    position: positionsByClientId.get(item.clientItemId) ?? nextPosition++,
  }));
};
