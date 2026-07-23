export const normalizeProductDisplayText = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

// Used for matching and indexing only. The visible description keeps its accents.
export const canonicalizeProductText = (value: string): string =>
  normalizeProductDisplayText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
