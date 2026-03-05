import {
  CustomerProfileStatus,
  CustomerSource,
} from "../../../infrastructure/database/generated/enums";

interface GetCustomersQueryRequestDtoProps {
  page: number;
  pageSize: number;
  search?: string;
  source?: CustomerSource;
  profileStatus?: CustomerProfileStatus;
}

export class GetCustomersQueryRequestDto {
  public readonly page: number;
  public readonly pageSize: number;
  public readonly search?: string;
  public readonly source?: CustomerSource;
  public readonly profileStatus?: CustomerProfileStatus;

  constructor(props: GetCustomersQueryRequestDtoProps) {
    this.page = props.page;
    this.pageSize = props.pageSize;
    this.search = props.search;
    this.source = props.source;
    this.profileStatus = props.profileStatus;
  }

  static create(input: unknown): [string?, GetCustomersQueryRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid query params."];
    }

    const source = input as Record<string, unknown>;

    const page = GetCustomersQueryRequestDto.parseNumber(source.page, 1);
    const pageSize = GetCustomersQueryRequestDto.parseNumber(source.pageSize, 20);
    const search =
      typeof source.search === "string" && source.search.trim().length > 0
        ? source.search.trim()
        : undefined;

    const sourceRaw =
      typeof source.source === "string" && source.source.trim().length > 0
        ? source.source.trim().toUpperCase()
        : undefined;

    const profileStatusRaw =
      typeof source.profileStatus === "string" && source.profileStatus.trim().length > 0
        ? source.profileStatus.trim().toUpperCase()
        : undefined;

    if (!Number.isInteger(page) || page <= 0) {
      return ["page must be a positive integer."];
    }

    if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 100) {
      return ["pageSize must be an integer between 1 and 100."];
    }

    if (sourceRaw && !Object.values(CustomerSource).includes(sourceRaw as CustomerSource)) {
      return ["source is invalid."];
    }

    if (
      profileStatusRaw &&
      !Object.values(CustomerProfileStatus).includes(profileStatusRaw as CustomerProfileStatus)
    ) {
      return ["profileStatus is invalid."];
    }

    return [
      ,
      new GetCustomersQueryRequestDto({
        page,
        pageSize,
        search,
        source: sourceRaw as CustomerSource | undefined,
        profileStatus: profileStatusRaw as CustomerProfileStatus | undefined,
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
