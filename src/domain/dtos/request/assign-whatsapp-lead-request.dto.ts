export class AssignWhatsAppLeadRequestDto {
  private constructor(public readonly sellerId: string) {}

  static create(input: unknown): [string?, AssignWhatsAppLeadRequestDto?] {
    const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const sellerId = typeof value.sellerId === "string" ? value.sellerId.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sellerId)) {
      return ["sellerId must be a valid UUID."];
    }
    return [undefined, new AssignWhatsAppLeadRequestDto(sellerId)];
  }
}
