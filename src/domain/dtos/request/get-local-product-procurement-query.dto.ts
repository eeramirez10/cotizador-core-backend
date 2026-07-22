import { ProductProcurementStatus } from "../../../infrastructure/database/generated/enums";

export class GetLocalProductProcurementQueryDto {
  constructor(
    public readonly page: number,
    public readonly pageSize: number,
    public readonly search?: string,
    public readonly status?: ProductProcurementStatus,
  ) {}

  static create(input: unknown): [string?, GetLocalProductProcurementQueryDto?] {
    const query = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const search = typeof query.search === "string" && query.search.trim()
      ? query.search.trim()
      : undefined;
    const statusRaw = typeof query.status === "string" ? query.status.trim().toUpperCase() : "";

    if (!Number.isInteger(page) || page < 1) return ["page must be a positive integer."];
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return ["pageSize must be between 1 and 100."];
    }
    if (statusRaw && !Object.values(ProductProcurementStatus).includes(statusRaw as ProductProcurementStatus)) {
      return ["status is invalid."];
    }

    return [, new GetLocalProductProcurementQueryDto(
      page,
      pageSize,
      search,
      statusRaw ? statusRaw as ProductProcurementStatus : undefined,
    )];
  }
}
