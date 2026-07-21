import { QuoteCatalogType } from "../../../infrastructure/database/generated/enums";

export interface UpsertQuoteCatalogOptionRequestDtoProps {
  type: QuoteCatalogType;
  code: string;
  label: string;
  value: string | null;
  numericValue: number | null;
  requiresComment: boolean;
  sortOrder: number;
  branchId: string | null;
  isActive: boolean;
}

const reasonTypes = new Set<QuoteCatalogType>([
  "REVISION_REASON",
  "REJECTION_REASON",
  "CANCELLATION_REASON",
  "APPROVAL_RETURN_REASON",
]);

const normalizeCode = (value: string): string => value
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "")
  .slice(0, 80);

export class UpsertQuoteCatalogOptionRequestDto {
  public readonly type: QuoteCatalogType;
  public readonly code: string;
  public readonly label: string;
  public readonly value: string | null;
  public readonly numericValue: number | null;
  public readonly requiresComment: boolean;
  public readonly sortOrder: number;
  public readonly branchId: string | null;
  public readonly isActive: boolean;

  constructor(props: UpsertQuoteCatalogOptionRequestDtoProps) {
    this.type = props.type;
    this.code = props.code;
    this.label = props.label;
    this.value = props.value;
    this.numericValue = props.numericValue;
    this.requiresComment = props.requiresComment;
    this.sortOrder = props.sortOrder;
    this.branchId = props.branchId;
    this.isActive = props.isActive;
  }

  static create(input: unknown, options?: { allowBranchId?: boolean; allowCode?: boolean }): [string?, UpsertQuoteCatalogOptionRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const typeRaw = typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
    if (!Object.values(QuoteCatalogType).includes(typeRaw as QuoteCatalogType)) return ["type is invalid."];
    const type = typeRaw as QuoteCatalogType;
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!label) return ["label is required."];
    if (label.length > 260) return ["label must contain at most 260 characters."];
    const providedCode = options?.allowCode && typeof body.code === "string" ? body.code : label;
    const code = normalizeCode(providedCode);
    if (!code) return ["code is invalid."];
    const valueRaw = typeof body.value === "string" ? body.value.trim() : "";
    const value = type === "VALIDITY_DAYS" || reasonTypes.has(type) ? null : (valueRaw || label);
    if (value && value.length > 2_000) return ["value must contain at most 2000 characters."];
    const numericRaw = body.numericValue;
    const numericValue = numericRaw === null || numericRaw === undefined || numericRaw === ""
      ? null
      : Math.trunc(Number(numericRaw));
    if (type === "VALIDITY_DAYS" && (!Number.isInteger(numericValue) || numericValue! < 1 || numericValue! > 365)) {
      return ["numericValue must be an integer between 1 and 365 for VALIDITY_DAYS."];
    }
    if (type !== "VALIDITY_DAYS" && numericValue !== null) return ["numericValue is only allowed for VALIDITY_DAYS."];
    const requiresComment = Boolean(body.requiresComment);
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : 0;
    if (sortOrder < 0 || sortOrder > 10_000) return ["sortOrder must be between 0 and 10000."];
    const branchId = options?.allowBranchId && typeof body.branchId === "string" && body.branchId.trim()
      ? body.branchId.trim()
      : null;
    const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
    return [, new UpsertQuoteCatalogOptionRequestDto({ type, code, label, value, numericValue, requiresComment, sortOrder, branchId, isActive })];
  }
}
