import { normalizeMeasurementUnit } from "../constants/measurement-unit.constants";
import type { QuoteCatalogRepository } from "../repositories/quote-catalog.repository";

export type LocalUnitCatalog = Pick<QuoteCatalogRepository, "listAvailable">;

export function parseLocalMeasurementUnitCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{1,30}$/.test(code) ? code : null;
}

export function parseLocalMeasurementUnit(value: unknown): string | null {
  return normalizeMeasurementUnit(value) ?? parseLocalMeasurementUnitCode(value);
}

export class InactiveLocalUnitError extends Error {
  constructor(code: string) {
    super(`La unidad ${code} no está activa en el catálogo de unidades de medida.`);
  }
}

export async function requireActiveLocalUnits(catalog: LocalUnitCatalog, branchId: string, codes: string[]): Promise<void> {
  const active = new Set((await catalog.listAvailable(branchId, "MEASUREMENT_UNIT")).map(option => option.code));
  for (const code of new Set(codes)) {
    if (!active.has(code)) throw new InactiveLocalUnitError(code);
  }
}
