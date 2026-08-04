import { WarehouseAccessMode } from "../../../infrastructure/database/generated/enums";

export class ReplaceWarehouseAccessRequestDto {
  private constructor(
    public readonly warehouseCodes: string[],
    public readonly accessMode: WarehouseAccessMode | null,
  ) {}

  static create(input: unknown, requireAccessMode = false): [string?, ReplaceWarehouseAccessRequestDto?] {
    if (!input || typeof input !== "object" || Array.isArray(input)) return ["Body is required."];
    const body = input as Record<string, unknown>;
    if (!Array.isArray(body.warehouseCodes)) return ["warehouseCodes must be an array."];
    if (body.warehouseCodes.length > 25) return ["warehouseCodes accepts a maximum of 25 values."];

    const warehouseCodes: string[] = [];
    for (const value of body.warehouseCodes) {
      if (typeof value !== "string" || !/^\d{1,4}$/.test(value.trim())) {
        return ["Every warehouse code must contain between 1 and 4 digits."];
      }
      warehouseCodes.push(value.trim().padStart(2, "0"));
    }

    const rawMode = typeof body.accessMode === "string" ? body.accessMode.trim().toUpperCase() : "";
    if (requireAccessMode && !rawMode) return ["accessMode is required."];
    if (rawMode && !Object.values(WarehouseAccessMode).includes(rawMode as WarehouseAccessMode)) {
      return ["accessMode must be INHERIT, ADDITIVE or OVERRIDE."];
    }

    return [, new ReplaceWarehouseAccessRequestDto(
      Array.from(new Set(warehouseCodes)),
      rawMode ? rawMode as WarehouseAccessMode : null,
    )];
  }
}
