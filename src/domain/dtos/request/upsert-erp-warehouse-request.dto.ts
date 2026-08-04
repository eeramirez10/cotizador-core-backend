interface UpsertErpWarehouseDtoOptions {
  requireCode: boolean;
}

export class UpsertErpWarehouseRequestDto {
  private constructor(
    public readonly code: string | null,
    public readonly name: string,
    public readonly companyCode: string | null,
    public readonly isActive: boolean | null,
  ) {}

  static create(input: unknown, options: UpsertErpWarehouseDtoOptions): [string?, UpsertErpWarehouseRequestDto?] {
    if (!input || typeof input !== "object" || Array.isArray(input)) return ["Body is required."];
    const body = input as Record<string, unknown>;

    const rawCode = typeof body.code === "string" ? body.code.trim() : "";
    if (options.requireCode && !rawCode) return ["code is required."];
    if (rawCode && !/^\d{1,4}$/.test(rawCode)) return ["code must contain between 1 and 4 digits."];

    const name = typeof body.name === "string" ? body.name.trim().toUpperCase() : "";
    if (!name) return ["name is required."];
    if (name.length > 160) return ["name must be 160 characters or fewer."];

    const rawCompanyCode = typeof body.companyCode === "string" ? body.companyCode.trim() : "";
    if (rawCompanyCode.length > 10) return ["companyCode must be 10 characters or fewer."];

    const isActive = typeof body.isActive === "boolean" ? body.isActive : null;
    return [, new UpsertErpWarehouseRequestDto(
      rawCode ? rawCode.padStart(2, "0") : null,
      name,
      rawCompanyCode || null,
      isActive,
    )];
  }
}
