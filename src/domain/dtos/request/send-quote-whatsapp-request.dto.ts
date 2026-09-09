interface SendQuoteWhatsAppRequestDtoProps {
  contactId?: string;
  message: string;
}

export class SendQuoteWhatsAppRequestDto {
  public readonly contactId?: string;
  public readonly message: string;

  private constructor(props: SendQuoteWhatsAppRequestDtoProps) {
    this.contactId = props.contactId;
    this.message = props.message;
  }

  static create(input: unknown): [string?, SendQuoteWhatsAppRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return ["message is required."];
    if (message.length > 1500) return ["message must not exceed 1500 characters."];

    const contactId = typeof body.contactId === "string" && body.contactId.trim()
      ? body.contactId.trim()
      : undefined;
    return [, new SendQuoteWhatsAppRequestDto({ contactId, message })];
  }
}
