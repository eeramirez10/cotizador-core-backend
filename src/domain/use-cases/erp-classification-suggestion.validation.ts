import type { ErpProductCatalogs } from "../../infrastructure/http/erp-product-catalogs.adapter";

export interface ErpClassificationSuggestion {
  group: string;
  code: string;
  confidence: number;
  evidence: string;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

export const validateErpClassificationSuggestions = (
  value: unknown,
  catalog: ErpProductCatalogs,
  description: string,
): ErpClassificationSuggestion[] => {
  const root = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (!Array.isArray(root.suggestions)) throw new Error("La IA devolvió clasificaciones no válidas.");
  const groups = new Map(catalog.groups.map((group) => [group.code, group]));
  const selected = new Set<string>();
  return root.suggestions.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const raw = entry as Record<string, unknown>;
    const group = typeof raw.group === "string" ? raw.group.trim().toUpperCase() : "";
    const code = typeof raw.code === "string" ? raw.code.trim() : "";
    const confidence = Number(raw.confidence);
    const evidence = typeof raw.evidence === "string" ? raw.evidence.trim() : "";
    if (selected.has(group) || !groups.get(group)?.options.some((option) => option.code === code && !/^NO ASIGNADO$/i.test(option.description))
      || !Number.isFinite(confidence) || confidence < 0.75 || confidence > 1
      || !evidence || !normalize(description).includes(normalize(evidence))) return [];
    selected.add(group);
    return [{ group, code, confidence, evidence }];
  });
};
