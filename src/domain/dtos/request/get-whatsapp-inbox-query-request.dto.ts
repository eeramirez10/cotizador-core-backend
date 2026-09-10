export class GetWhatsAppInboxQueryRequestDto {
  private constructor(
    public readonly search: string | undefined,
    public readonly cursor: string | undefined,
    public readonly after: string | undefined,
    public readonly pageSize: number,
  ) {}

  static create(input: Record<string, unknown>): [string?, GetWhatsAppInboxQueryRequestDto?] {
    const search = typeof input.search === "string" ? input.search.trim() : undefined;
    const cursor = typeof input.cursor === "string" ? input.cursor.trim() : undefined;
    const after = typeof input.after === "string" ? input.after.trim() : undefined;
    const rawPageSize = typeof input.pageSize === "string" ? Number(input.pageSize) : Number(input.pageSize || 30);
    if (!Number.isFinite(rawPageSize) || rawPageSize < 1 || rawPageSize > 100) {
      return ["pageSize must be between 1 and 100."];
    }
    if (after && Number.isNaN(Date.parse(after))) return ["after must be a valid ISO date."];
    if (after && cursor) return ["cursor and after cannot be used together."];
    return [undefined, new GetWhatsAppInboxQueryRequestDto(
      search || undefined,
      cursor || undefined,
      after || undefined,
      Math.trunc(rawPageSize),
    )];
  }
}
