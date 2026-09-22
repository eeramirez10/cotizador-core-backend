export const normalizeOptionalCatalogText = (
  value: unknown,
  maxLength: number,
): string | null | undefined => {
  if (typeof value === "undefined") return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
};

export const parseTechnicalAttributes = (
  value: unknown,
): [string?, Record<string, string>?] => {
  if (typeof value === "undefined") return [, undefined];
  if (value === null) return [, {}];
  if (typeof value !== "object" || Array.isArray(value)) {
    return ["technicalAttributes must be an object."];
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 40) return ["technicalAttributes supports up to 40 fields."];

  const result: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries) {
    if (typeof rawValue !== "string") {
      return [`technicalAttributes.${rawKey} must be a string.`];
    }
    const key = rawKey.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const fieldValue = rawValue.trim().toUpperCase();
    if (!key || key.length > 60) return [`technicalAttributes.${rawKey} has an invalid key.`];
    if (fieldValue.length > 240) return [`technicalAttributes.${rawKey} is too long.`];
    if (fieldValue) result[key] = fieldValue;
  }
  return [, result];
};
