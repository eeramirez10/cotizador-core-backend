const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MarkWhatsAppAttachmentQuoteExtractionRequestDto {
  private constructor(public readonly clientDraftId: string) {}

  static create(input: unknown): [string?, MarkWhatsAppAttachmentQuoteExtractionRequestDto?] {
    const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const clientDraftId = typeof value.clientDraftId === "string" ? value.clientDraftId.trim() : "";
    if (!UUID_PATTERN.test(clientDraftId)) return ["clientDraftId must be a valid UUID."];
    return [undefined, new MarkWhatsAppAttachmentQuoteExtractionRequestDto(clientDraftId)];
  }
}
