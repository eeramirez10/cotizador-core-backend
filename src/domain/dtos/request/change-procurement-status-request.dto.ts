import { ProductProcurementStatus } from "../../../infrastructure/database/generated/enums";

export class ChangeProcurementStatusRequestDto {
  constructor(
    public readonly status: ProductProcurementStatus,
    public readonly comment: string | null,
  ) {}

  static create(input: unknown): [string?, ChangeProcurementStatusRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const statusRaw = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
    const comment = typeof body.comment === "string" && body.comment.trim()
      ? body.comment.trim()
      : null;

    if (!Object.values(ProductProcurementStatus).includes(statusRaw as ProductProcurementStatus)) {
      return ["status is invalid."];
    }
    if (comment && comment.length > 1000) return ["comment must contain at most 1000 characters."];

    return [, new ChangeProcurementStatusRequestDto(statusRaw as ProductProcurementStatus, comment)];
  }
}
