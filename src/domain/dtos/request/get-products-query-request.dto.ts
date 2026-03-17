import { ProductSource } from "../../../infrastructure/database/generated/enums";

interface GetProductsQueryRequestDtoProps {
  page: number;
  pageSize: number;
  search?: string;
  source?: ProductSource;
  branchCode?: string;
  includeInactive?: boolean;
  isActive?: boolean;
}

export class GetProductsQueryRequestDto {
  public readonly page: number;
  public readonly pageSize: number;
  public readonly search?: string;
  public readonly source?: ProductSource;
  public readonly branchCode?: string;
  public readonly includeInactive?: boolean;
  public readonly isActive?: boolean;

  constructor(props: GetProductsQueryRequestDtoProps) {
    this.page = props.page;
    this.pageSize = props.pageSize;
    this.search = props.search;
    this.source = props.source;
    this.branchCode = props.branchCode;
    this.includeInactive = props.includeInactive;
    this.isActive = props.isActive;
  }

  static create(input: unknown): [string?, GetProductsQueryRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid query params."];
    }

    const source = input as Record<string, unknown>;
    const page = GetProductsQueryRequestDto.parseNumber(source.page, 1);
    const pageSize = GetProductsQueryRequestDto.parseNumber(source.pageSize, 20);

    if (!Number.isInteger(page) || page <= 0) {
      return ["page must be a positive integer."];
    }

    if (!Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 100) {
      return ["pageSize must be an integer between 1 and 100."];
    }

    const search =
      typeof source.search === "string" && source.search.trim().length > 0
        ? source.search.trim()
        : undefined;

    const sourceRaw =
      typeof source.source === "string" && source.source.trim().length > 0
        ? source.source.trim().toUpperCase()
        : undefined;

    if (sourceRaw && !Object.values(ProductSource).includes(sourceRaw as ProductSource)) {
      return ["source is invalid."];
    }

    const branchCode =
      typeof source.branchCode === "string" && source.branchCode.trim().length > 0
        ? source.branchCode.trim().toUpperCase()
        : undefined;

    const includeInactive = GetProductsQueryRequestDto.parseOptionalBoolean(source.includeInactive);
    if (source.includeInactive !== undefined && typeof includeInactive === "undefined") {
      return ["includeInactive must be boolean."];
    }

    const isActive = GetProductsQueryRequestDto.parseOptionalBoolean(source.isActive);
    if (source.isActive !== undefined && typeof isActive === "undefined") {
      return ["isActive must be boolean."];
    }

    return [
      ,
      new GetProductsQueryRequestDto({
        page,
        pageSize,
        search,
        source: sourceRaw as ProductSource | undefined,
        branchCode,
        includeInactive,
        isActive,
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

  private static parseOptionalBoolean(value: unknown): boolean | undefined {
    if (typeof value === "undefined") return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") return true;
      if (normalized === "false" || normalized === "0") return false;
    }

    return undefined;
  }
}
