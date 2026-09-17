const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ConvertWhatsAppLeadRequestDto {
  private constructor(
    public readonly customerId: string,
    public readonly customerContactId: string | null,
  ) {}

  static create(input: unknown): [string?, ConvertWhatsAppLeadRequestDto?] {
    const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const customerId = typeof value.customerId === "string" ? value.customerId.trim() : "";
    if (!UUID_PATTERN.test(customerId)) return ["customerId must be a valid UUID."];

    const customerContactId = typeof value.customerContactId === "string" && value.customerContactId.trim()
      ? value.customerContactId.trim()
      : null;
    if (customerContactId && !UUID_PATTERN.test(customerContactId)) {
      return ["customerContactId must be a valid UUID."];
    }
    return [undefined, new ConvertWhatsAppLeadRequestDto(customerId, customerContactId)];
  }
}
