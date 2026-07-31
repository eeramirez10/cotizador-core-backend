export class RegisterErpQuoteRequestDto {
  private constructor(public readonly erpQuoteNumber: string) {}

  static create(input: unknown): [string?, RegisterErpQuoteRequestDto?] {
    if (!input || typeof input !== "object") return ["Request body is required."];

    const value = (input as { erpQuoteNumber?: unknown }).erpQuoteNumber;
    if (typeof value !== "string" || !value.trim()) return ["erpQuoteNumber is required."];

    const normalized = value.trim().toUpperCase();
    if (normalized.length > 80) return ["erpQuoteNumber must not exceed 80 characters."];
    if (/[\r\n\t]/.test(normalized)) return ["erpQuoteNumber contains unsupported characters."];

    return [undefined, new RegisterErpQuoteRequestDto(normalized)];
  }
}
