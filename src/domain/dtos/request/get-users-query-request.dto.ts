interface GetUsersQueryRequestDtoProps {
  page: number;
  pageSize: number;
  search?: string;
  branchCode?: string;
}

export class GetUsersQueryRequestDto {
  public readonly page: number;
  public readonly pageSize: number;
  public readonly search?: string;
  public readonly branchCode?: string;

  constructor(props: GetUsersQueryRequestDtoProps) {
    this.page = props.page;
    this.pageSize = props.pageSize;
    this.search = props.search;
    this.branchCode = props.branchCode;
  }

  static create(input: unknown): [string?, GetUsersQueryRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid query params."];
    }

    const source = input as Record<string, unknown>;

    const pageRaw = source.page;
    const pageSizeRaw = source.pageSize;
    const searchRaw = source.search;
    const branchCodeRaw = source.branchCode;

    const page = GetUsersQueryRequestDto.parseNumber(pageRaw, 1);
    const pageSize = GetUsersQueryRequestDto.parseNumber(pageSizeRaw, 20);

    if (!Number.isInteger(page) || page <= 0) {
      return ["page must be a positive integer."];
    }

    if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 100) {
      return ["pageSize must be an integer between 1 and 100."];
    }

    const search =
      typeof searchRaw === "string" && searchRaw.trim().length > 0 ? searchRaw.trim() : undefined;
    const branchCode =
      typeof branchCodeRaw === "string" && branchCodeRaw.trim().length > 0
        ? branchCodeRaw.trim().toUpperCase()
        : undefined;

    return [
      ,
      new GetUsersQueryRequestDto({
        page,
        pageSize,
        search,
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
