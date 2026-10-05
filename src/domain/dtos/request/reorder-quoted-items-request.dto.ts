export class ReorderQuotedItemsRequestDto {
  private constructor(public readonly itemIds: string[]) {}

  static create(body: unknown): [string?, ReorderQuotedItemsRequestDto?] {
    if (!body || typeof body !== "object" || Array.isArray(body)) return ["Invalid request body."];
    const itemIds = (body as { itemIds?: unknown }).itemIds;
    if (!Array.isArray(itemIds) || itemIds.length < 2 || itemIds.length > 500
      || itemIds.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))
      || new Set(itemIds).size !== itemIds.length) {
      return ["itemIds must contain at least two distinct quote item ids."];
    }
    return [undefined, new ReorderQuotedItemsRequestDto(itemIds)];
  }
}
