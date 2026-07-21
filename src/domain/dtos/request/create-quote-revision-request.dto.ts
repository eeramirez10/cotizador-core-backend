interface CreateQuoteRevisionRequestDtoProps {
  reason: string;
  comment: string | null;
}

export class CreateQuoteRevisionRequestDto {
  public readonly reason: string;
  public readonly comment: string | null;

  constructor(props: CreateQuoteRevisionRequestDtoProps) {
    this.reason = props.reason;
    this.comment = props.comment;
  }

  static create(input: unknown): [string?, CreateQuoteRevisionRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];

    const body = input as Record<string, unknown>;
    const reasonRaw = typeof body.reason === "string" ? body.reason.trim().toUpperCase() : "";
    if (!/^[A-Z0-9_]{2,80}$/.test(reasonRaw)) return ["reason is invalid."];

    const comment = typeof body.comment === "string" && body.comment.trim() ? body.comment.trim() : null;
    if (comment && comment.length > 500) return ["comment must be 500 characters or fewer."];
    return [, new CreateQuoteRevisionRequestDto({ reason: reasonRaw, comment })];
  }
}
