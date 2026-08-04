export class SearchErpProductsRequestDto {
  private constructor(public readonly term: string) {}

  static create(value: unknown): [string?, SearchErpProductsRequestDto?] {
    if (typeof value !== "string" || !value.trim()) return ["query is required."];
    const term = value.trim().toUpperCase();
    if (term.length > 160) return ["query must be 160 characters or fewer."];
    return [, new SearchErpProductsRequestDto(term)];
  }
}
