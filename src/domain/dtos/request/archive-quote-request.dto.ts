export class ArchiveQuoteRequestDto {
  constructor(public readonly reason: string) {}

  static create(input: unknown): [string?, ArchiveQuoteRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const reason = typeof (input as Record<string, unknown>).reason === "string"
      ? ((input as Record<string, unknown>).reason as string).trim()
      : "";
    if (!reason) return ["reason is required."];
    if (reason.length > 500) return ["reason must be 500 characters or fewer."];
    return [, new ArchiveQuoteRequestDto(reason)];
  }
}
