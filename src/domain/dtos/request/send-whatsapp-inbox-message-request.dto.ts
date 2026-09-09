export class SendWhatsAppInboxMessageRequestDto {
  private constructor(
    public readonly body: string,
    public readonly clientMessageId: string,
  ) {}

  static create(input: unknown): [string?, SendWhatsAppInboxMessageRequestDto?] {
    const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const body = typeof value.body === "string" ? value.body.trim() : "";
    const clientMessageId = typeof value.clientMessageId === "string" ? value.clientMessageId.trim() : "";
    if (!body) return ["body is required."];
    if (body.length > 1600) return ["body cannot exceed 1600 characters."];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientMessageId)) {
      return ["clientMessageId must be a valid UUID."];
    }
    return [undefined, new SendWhatsAppInboxMessageRequestDto(body, clientMessageId)];
  }
}
