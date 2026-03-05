import { QuoteStatus } from "../../../infrastructure/database/generated/enums";

interface ChangeQuoteStatusRequestDtoProps {
  status: QuoteStatus;
  note: string | null;
}

export class ChangeQuoteStatusRequestDto {
  public readonly status: QuoteStatus;
  public readonly note: string | null;

  constructor(props: ChangeQuoteStatusRequestDtoProps) {
    this.status = props.status;
    this.note = props.note;
  }

  static create(input: unknown): [string?, ChangeQuoteStatusRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    const statusRaw = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
    if (!Object.values(QuoteStatus).includes(statusRaw as QuoteStatus)) {
      return ["status is invalid."];
    }

    const note =
      typeof body.note === "string" && body.note.trim().length > 0 ? body.note.trim() : null;

    return [
      ,
      new ChangeQuoteStatusRequestDto({
        status: statusRaw as QuoteStatus,
        note,
      }),
    ];
  }
}
