export const ERP_DRAFT_TEXT_LIMITS = {
  code: 13,
  description: 60,
  extendedDescription: 4800,
  satCode: 8,
  familyCode: 16,
  unitCode: 30,
  ean: 120,
  upc: 120,
  supplierProductCode: 120,
  location: 30,
  primaryAccount: 30,
  secondaryAccount: 30,
  costAccount: 30,
  salesProfile: 10,
  purchaseProfile: 10,
  notes: 1000,
} as const;

const numericFields = [
  "salePrice1", "salePrice2", "salePrice3", "quotedUnitCost", "minimumStock", "maximumStock", "adValorem", "weight",
] as const;
const currencyFields = ["saleCurrency1", "saleCurrency2", "saleCurrency3", "quotedCurrency"] as const;

export type ErpDraftData = Partial<Record<keyof typeof ERP_DRAFT_TEXT_LIMITS, string>> &
  Partial<Record<(typeof numericFields)[number], number>> &
  Partial<Record<(typeof currencyFields)[number], "MXN" | "USD">> &
  { productType?: 0 | 1 | 2 | 3 | 4; erpCurrency?: 1 | 2; ivaType?: 0 | 1 | 2; noLayers?: boolean; classifications?: Record<string, string> };

export const parseErpDraftData = (value: unknown): ErpDraftData => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("La ficha ERP debe ser un objeto.");
  const input = value as Record<string, unknown>;
  const allowed = new Set([...Object.keys(ERP_DRAFT_TEXT_LIMITS), ...numericFields, ...currencyFields, "productType", "erpCurrency", "ivaType", "noLayers", "classifications"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new Error("La ficha ERP contiene campos no admitidos.");
  const data: Record<string, string | number> = {};
  for (const [field, limit] of Object.entries(ERP_DRAFT_TEXT_LIMITS)) {
    const raw = input[field];
    if (raw === undefined || raw === null || raw === "") continue;
    if (typeof raw !== "string" || raw.trim().length > limit) throw new Error(`${field} debe tener máximo ${limit} caracteres.`);
    data[field] = raw.trim();
  }
  if (data.satCode && !/^\d{8}$/.test(String(data.satCode))) throw new Error("La clave SAT debe tener exactamente 8 dígitos.");
  for (const field of numericFields) {
    const raw = input[field];
    if (raw === undefined || raw === null || raw === "") continue;
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) throw new Error(`${field} debe ser un número no negativo.`);
    data[field] = raw;
  }
  for (const field of currencyFields) {
    const raw = input[field];
    if (raw === undefined || raw === null || raw === "") continue;
    if (raw !== "MXN" && raw !== "USD") throw new Error(`${field} debe ser MXN o USD.`);
    data[field] = raw;
  }
  if (input.productType !== undefined && input.productType !== null) {
    if (![0, 1, 2, 3, 4].includes(input.productType as number)) throw new Error("Tipo de producto ERP no válido.");
    data.productType = input.productType as number;
  }
  if (input.erpCurrency !== undefined && input.erpCurrency !== null) {
    if (input.erpCurrency !== 1 && input.erpCurrency !== 2) throw new Error("La moneda ERP debe ser 1 (MXN) o 2 (USD).");
    data.erpCurrency = input.erpCurrency;
  }
  if (input.ivaType !== undefined && input.ivaType !== null) {
    if (input.ivaType !== 0 && input.ivaType !== 1 && input.ivaType !== 2) throw new Error("El tipo de IVA ERP no es válido.");
    data.ivaType = input.ivaType;
  }
  if (input.noLayers !== undefined && input.noLayers !== null) {
    if (typeof input.noLayers !== "boolean") throw new Error("INOCAPAS debe ser verdadero o falso.");
  }
  let classifications: Record<string, string> | undefined;
  if (input.classifications !== undefined) {
    if (!input.classifications || typeof input.classifications !== "object" || Array.isArray(input.classifications)) {
      throw new Error("Las clasificaciones ERP deben ser un objeto de grupos y claves.");
    }
    classifications = {};
    for (const [group, raw] of Object.entries(input.classifications)) {
      if (!/^[1-9A-R]$/.test(group) || typeof raw !== "string") throw new Error("Grupo de clasificación ERP no válido.");
      const code = raw.trim();
      if (!code) continue;
      if (!code.startsWith(group) || code.length > (group === "7" ? 7 : 4)) {
        throw new Error(`La clave de clasificación ${group} no corresponde a su grupo ERP.`);
      }
      classifications[group] = code;
    }
  }
  return { ...data, ...(typeof input.noLayers === "boolean" ? { noLayers: input.noLayers } : {}), ...(classifications ? { classifications } : {}) } as ErpDraftData;
};
