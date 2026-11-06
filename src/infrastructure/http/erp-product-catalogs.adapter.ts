import type { EanCatalogReference } from "../../domain/use-cases/erp-ean-suggestion";

export interface ErpProductCatalogs {
  units: Array<{ id: number; code: string; description: string; satCode: string | null; inactive: boolean }>;
  groups: Array<{
    code: string;
    label: string;
    options: Array<{ code: string; description: string; parentCode: string | null; satCode: string | null }>;
  }>;
}

export interface ErpEanMatch {
  code: string;
  ean: string;
  description: string;
  productType: number;
}

export class ErpProductCatalogsAdapter {
  constructor(
    private readonly apiUrl: string,
    private readonly productsBasePath: string,
    private readonly timeoutMs: number,
    private readonly apiKey: string | undefined,
  ) {}

  async findMexicoEanReferences(prefixes: string[]): Promise<{ references: EanCatalogReference[]; hasMore: boolean }> {
    if (!this.apiKey) throw new Error("La clave interna del ERP no está configurada.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const baseUrl = this.apiUrl.replace(/\/+$/, "");
      const basePath = this.productsBasePath.replace(/^\/+|\/+$/g, "");
      const response = await fetch(`${baseUrl}/${basePath}/ean-references`, {
        method: "POST", signal: controller.signal,
        headers: { "x-internal-api-key": this.apiKey, "content-type": "application/json" },
        body: JSON.stringify({ prefixes }),
      });
      if (!response.ok) throw new Error(`Las referencias EAN de México respondieron HTTP ${response.status}.`);
      const payload = await response.json() as { references?: unknown; hasMore?: unknown };
      if (!Array.isArray(payload.references) || payload.references.length > 100 || typeof payload.hasMore !== "boolean"
        || payload.references.some((row) => !row || typeof row !== "object" || typeof row.code !== "string"
          || !row.code.startsWith("01") || row.branchCode !== "01" || row.productType !== 1 || typeof row.ean !== "string"
          || typeof row.description !== "string" || typeof row.family !== "string")) {
        throw new Error("El ERP devolvió referencias EAN de México no válidas.");
      }
      return payload as { references: EanCatalogReference[]; hasMore: boolean };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("La consulta de referencias EAN de México excedió el tiempo de espera.");
      throw error;
    } finally { clearTimeout(timeout); }
  }

  async list(): Promise<ErpProductCatalogs> {
    if (!this.apiKey) throw new Error("La clave interna del ERP no está configurada.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const baseUrl = this.apiUrl.replace(/\/+$/, "");
      const basePath = this.productsBasePath.replace(/^\/+|\/+$/g, "");
      const response = await fetch(`${baseUrl}/${basePath}/catalogs`, {
        signal: controller.signal,
        headers: { "x-internal-api-key": this.apiKey },
      });
      if (!response.ok) throw new Error(`El catálogo ERP respondió HTTP ${response.status}.`);
      const payload = await response.json() as Partial<ErpProductCatalogs>;
      if (!Array.isArray(payload.units) || !Array.isArray(payload.groups)) {
        throw new Error("El ERP devolvió un catálogo de productos no válido.");
      }
      return payload as ErpProductCatalogs;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("La consulta del catálogo ERP excedió el tiempo de espera.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async findExactEan(ean: string): Promise<{ matches: ErpEanMatch[]; hasMore: boolean }> {
    if (!this.apiKey) throw new Error("La clave interna del ERP no está configurada.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const baseUrl = this.apiUrl.replace(/\/+$/, "");
      const basePath = this.productsBasePath.replace(/^\/+|\/+$/g, "");
      const response = await fetch(`${baseUrl}/${basePath}/ean-exact/${encodeURIComponent(ean)}`, {
        signal: controller.signal,
        headers: { "x-internal-api-key": this.apiKey },
      });
      if (!response.ok) throw new Error(`La verificación de EAN en ERP respondió HTTP ${response.status}.`);
      const payload = await response.json() as { matches?: unknown; hasMore?: unknown };
      if (!Array.isArray(payload.matches) || typeof payload.hasMore !== "boolean" || payload.matches.some((match) =>
        !match || typeof match !== "object" || typeof match.code !== "string" || typeof match.ean !== "string" || typeof match.description !== "string")) {
        throw new Error("El ERP devolvió una verificación de EAN no válida.");
      }
      return payload as { matches: ErpEanMatch[]; hasMore: boolean };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("La verificación de EAN en ERP excedió el tiempo de espera.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
