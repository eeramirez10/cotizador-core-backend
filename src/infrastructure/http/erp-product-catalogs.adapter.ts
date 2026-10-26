export interface ErpProductCatalogs {
  units: Array<{ id: number; code: string; description: string; satCode: string | null; inactive: boolean }>;
  groups: Array<{
    code: string;
    label: string;
    options: Array<{ code: string; description: string; parentCode: string | null; satCode: string | null }>;
  }>;
}

export class ErpProductCatalogsAdapter {
  constructor(
    private readonly apiUrl: string,
    private readonly productsBasePath: string,
    private readonly timeoutMs: number,
    private readonly apiKey: string | undefined,
  ) {}

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
}
