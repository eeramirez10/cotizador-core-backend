import {
  QuoteCancellationReason,
  QuoteRejectionReason,
  QuoteStatus,
  QuoteApprovalReturnReason,
} from "../../../infrastructure/database/generated/enums";

interface ChangeQuoteStatusRequestDtoProps {
  status: QuoteStatus;
  note: string | null;
  rejectionReason: QuoteRejectionReason | null;
  rejectionComment: string | null;
  cancellationReason: QuoteCancellationReason | null;
  cancellationComment: string | null;
  approvalReturnReason: QuoteApprovalReturnReason | null;
  approvalReturnComment: string | null;
}

export class ChangeQuoteStatusRequestDto {
  public readonly status: QuoteStatus;
  public readonly note: string | null;
  public readonly rejectionReason: QuoteRejectionReason | null;
  public readonly rejectionComment: string | null;
  public readonly cancellationReason: QuoteCancellationReason | null;
  public readonly cancellationComment: string | null;
  public readonly approvalReturnReason: QuoteApprovalReturnReason | null;
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
    const rejectionReason = rejectionReasonRaw ? rejectionReasonRaw as QuoteRejectionReason : null;
    const cancellationReasonRaw =
      typeof body.cancellationReason === "string" ? body.cancellationReason.trim().toUpperCase() : "";
    const cancellationComment =
      typeof body.cancellationComment === "string" && body.cancellationComment.trim().length > 0
        ? body.cancellationComment.trim()
        : null;
    const cancellationReason = cancellationReasonRaw ? cancellationReasonRaw as QuoteCancellationReason : null;
    const approvalReturnReasonRaw =
      typeof body.approvalReturnReason === "string" ? body.approvalReturnReason.trim().toUpperCase() : "";
    const approvalReturnComment =
      typeof body.approvalReturnComment === "string" && body.approvalReturnComment.trim().length > 0
        ? body.approvalReturnComment.trim()
        : null;
    const approvalReturnReason = approvalReturnReasonRaw
      ? approvalReturnReasonRaw as QuoteApprovalReturnReason
      : null;

    if (statusRaw === "REJECTED") {
      if (!rejectionReason || !Object.values(QuoteRejectionReason).includes(rejectionReason)) {
        return ["rejectionReason is required when rejecting a quote."];
      }
      if (rejectionReason === "OTHER" && !rejectionComment) {
        return ["rejectionComment is required when rejectionReason is OTHER."];
      }
    }

    if (statusRaw === "CANCELLED") {
      if (!cancellationReason || !Object.values(QuoteCancellationReason).includes(cancellationReason)) {
        return ["cancellationReason is required when cancelling a quote."];
      }
      if (cancellationReason === "OTHER" && !cancellationComment) {
        return ["cancellationComment is required when cancellationReason is OTHER."];
      }
    }

    if (statusRaw === "CHANGES_REQUESTED") {
      if (!approvalReturnReason || !Object.values(QuoteApprovalReturnReason).includes(approvalReturnReason)) {
        return ["approvalReturnReason is required when requesting changes."];
      }
      if (approvalReturnReason === "OTHER" && !approvalReturnComment) {
        return ["approvalReturnComment is required when approvalReturnReason is OTHER."];
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
