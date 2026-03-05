import { QuoteStatus } from "../../../infrastructure/database/generated/enums";

interface GetQuotesQueryRequestDtoProps {
  page: number;
  pageSize: number;
  search?: string;
  status?: QuoteStatus;
  branchCode?: string;
}

export class GetQuotesQueryRequestDto {
  public readonly page: number;
  public readonly pageSize: number;
  public readonly search?: string;
  public readonly status?: QuoteStatus;
  public readonly branchCode?: string;

  constructor(props: GetQuotesQueryRequestDtoProps) {
    this.page = props.page;
    this.pageSize = props.pageSize;
    this.search = props.search;
    this.status = props.status;
    this.branchCode = props.branchCode;
  }

  static create(input: unknown): [string?, GetQuotesQueryRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid query params."];
    }

    const query = input as Record<string, unknown>;

    const page = GetQuotesQueryRequestDto.parseNumber(query.page, 1);
    const pageSize = GetQuotesQueryRequestDto.parseNumber(query.pageSize, 20);
    if (!Number.isInteger(page) || page <= 0) {
      return ["page must be a positive integer."];
    }
    if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 100) {
      return ["pageSize must be an integer between 1 and 100."];
    }

    const search =
      typeof query.search === "string" && query.search.trim().length > 0 ? query.search.trim() : undefined;

    const statusRaw =
      typeof query.status === "string" && query.status.trim().length > 0
        ? query.status.trim().toUpperCase()
        : undefined;
    if (statusRaw && !Object.values(QuoteStatus).includes(statusRaw as QuoteStatus)) {
      return ["status is invalid."];
    }

    const branchCode =
      typeof query.branchCode === "string" && query.branchCode.trim().length > 0
        ? query.branchCode.trim().toUpperCase()
        : undefined;

    return [
      ,
      new GetQuotesQueryRequestDto({
        page,
        pageSize,
        search,
        status: statusRaw as QuoteStatus | undefined,
        branchCode,
      }),
    ];
  }

  private static parseNumber(value: unknown, fallback: number): number {
    if (typeof value === "undefined") return fallback;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return Number.NaN;
  }
}
