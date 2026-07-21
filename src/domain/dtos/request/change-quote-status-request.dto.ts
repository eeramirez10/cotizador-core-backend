import {
  QuoteStatus,
} from "../../../infrastructure/database/generated/enums";

interface ChangeQuoteStatusRequestDtoProps {
  status: QuoteStatus;
  note: string | null;
  rejectionReason: string | null;
  rejectionComment: string | null;
  cancellationReason: string | null;
  cancellationComment: string | null;
  approvalReturnReason: string | null;
  approvalReturnComment: string | null;
}

export class ChangeQuoteStatusRequestDto {
  public readonly status: QuoteStatus;
  public readonly note: string | null;
  public readonly rejectionReason: string | null;
  public readonly rejectionComment: string | null;
  public readonly cancellationReason: string | null;
  public readonly cancellationComment: string | null;
  public readonly approvalReturnReason: string | null;
  public readonly approvalReturnComment: string | null;

  constructor(props: ChangeQuoteStatusRequestDtoProps) {
    this.status = props.status;
    this.note = props.note;
    this.rejectionReason = props.rejectionReason;
    this.rejectionComment = props.rejectionComment;
    this.cancellationReason = props.cancellationReason;
    this.cancellationComment = props.cancellationComment;
    this.approvalReturnReason = props.approvalReturnReason;
    this.approvalReturnComment = props.approvalReturnComment;
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
    const rejectionReasonRaw =
      typeof body.rejectionReason === "string" ? body.rejectionReason.trim().toUpperCase() : "";
    const rejectionComment =
      typeof body.rejectionComment === "string" && body.rejectionComment.trim().length > 0
        ? body.rejectionComment.trim()
        : null;
    const rejectionReason = rejectionReasonRaw || null;
    const cancellationReasonRaw =
      typeof body.cancellationReason === "string" ? body.cancellationReason.trim().toUpperCase() : "";
    const cancellationComment =
      typeof body.cancellationComment === "string" && body.cancellationComment.trim().length > 0
        ? body.cancellationComment.trim()
        : null;
    const cancellationReason = cancellationReasonRaw || null;
    const approvalReturnReasonRaw =
      typeof body.approvalReturnReason === "string" ? body.approvalReturnReason.trim().toUpperCase() : "";
    const approvalReturnComment =
      typeof body.approvalReturnComment === "string" && body.approvalReturnComment.trim().length > 0
        ? body.approvalReturnComment.trim()
        : null;
    const approvalReturnReason = approvalReturnReasonRaw || null;

    if (statusRaw === "REJECTED") {
      if (!rejectionReason || !/^[A-Z0-9_]{2,80}$/.test(rejectionReason)) {
        return ["rejectionReason is required when rejecting a quote."];
      }
    }

    if (statusRaw === "CANCELLED") {
      if (!cancellationReason || !/^[A-Z0-9_]{2,80}$/.test(cancellationReason)) {
        return ["cancellationReason is required when cancelling a quote."];
      }
    }

    if (statusRaw === "CHANGES_REQUESTED") {
      if (!approvalReturnReason || !/^[A-Z0-9_]{2,80}$/.test(approvalReturnReason)) {
        return ["approvalReturnReason is required when requesting changes."];
      }
    }

    return [
      ,
      new ChangeQuoteStatusRequestDto({
        status: statusRaw as QuoteStatus,
        note,
        rejectionReason,
        rejectionComment,
        cancellationReason,
        cancellationComment,
        approvalReturnReason,
        approvalReturnComment,
      }),
    ];
  }
}
