export class DeleteQuoteRequestDto {
  constructor(
    public readonly confirmation: string,
    public readonly reason: string
  ) {}

  static create(input: unknown): [string?, DeleteQuoteRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const confirmation = typeof body.confirmation === "string" ? body.confirmation.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!confirmation) return ["confirmation is required."];
    if (!reason) return ["reason is required."];
    if (reason.length > 500) return ["reason must be 500 characters or fewer."];
    return [, new DeleteQuoteRequestDto(confirmation, reason)];
  }
}
