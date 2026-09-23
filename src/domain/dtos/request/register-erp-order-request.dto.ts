export class RegisterErpOrderRequestDto {
  private constructor(public readonly erpOrderNumber: string) {}

  static create(input: unknown): [string?, RegisterErpOrderRequestDto?] {
    if (!input || typeof input !== "object") return ["Request body is required."];
    const value = (input as { erpOrderNumber?: unknown }).erpOrderNumber;
    if (typeof value !== "string" || !value.trim()) return ["erpOrderNumber is required."];
    const normalized = value.trim().toUpperCase();
    if (normalized.length > 80) return ["erpOrderNumber must not exceed 80 characters."];
    if (/[^A-Z0-9]/.test(normalized)) return ["erpOrderNumber must contain only letters and digits."];
    return [undefined, new RegisterErpOrderRequestDto(normalized)];
  }
}
