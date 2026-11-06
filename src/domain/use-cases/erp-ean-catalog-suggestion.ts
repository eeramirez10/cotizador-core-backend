import { buildEanCandidate, rankEanReferences, type EanAttribute, type EanCatalogReference, type EanOrigin } from "./erp-ean-suggestion";

interface EanMatch { code: string; ean: string; description: string; productType: number }
export interface EanCatalogLookup {
  findExactEan(ean: string): Promise<{ matches: EanMatch[]; hasMore: boolean }>;
  findMexicoEanReferences(prefixes: string[]): Promise<{ references: EanCatalogReference[]; hasMore: boolean }>;
}
export const suggestEanWithCatalog = async (description: string, extraction: { attributes: EanAttribute[]; unmapped: string[] },
  origin: EanOrigin | undefined, catalogs: EanCatalogLookup) => {
  const suggestion = buildEanCandidate(description, extraction, { origin });
  const [lookup, catalog] = await Promise.all([
    suggestion.candidate ? catalogs.findExactEan(suggestion.candidate) : Promise.resolve({ matches: [], hasMore: false }),
    suggestion.referencePrefixes.length ? catalogs.findMexicoEanReferences(suggestion.referencePrefixes)
      : Promise.resolve({ references: [], hasMore: false }),
  ]);
  const references = rankEanReferences(description, extraction.attributes, catalog.references);
  const warnings = [...suggestion.warnings];
  const notices: string[] = [];
  if (lookup.matches.length) notices.push("Este EAN se usa en otros registros ERP. Puede repetirse; cada producto se identifica por su código ICOD y su sucursal.");
  if (lookup.hasMore) notices.push("Hay más registros con el mismo EAN de los que se muestran. Esto no impide usar la propuesta.");
  if (catalog.hasMore) warnings.push("La consulta de referencias fue limitada; revisa también el catálogo ERP antes de crear el producto.");
  const { referencePrefixes: _prefixes, ...result } = suggestion;
  return { ...result, warnings, notices, references, referenceBranch: "01" as const, matches: lookup.matches, hasMore: lookup.hasMore,
    canApply: suggestion.complete };
};
