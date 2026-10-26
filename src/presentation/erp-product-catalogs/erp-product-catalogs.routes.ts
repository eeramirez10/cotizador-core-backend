import { Router } from "express";
import { Envs } from "../../config/envs";
import { ErpProductCatalogsAdapter } from "../../infrastructure/http/erp-product-catalogs.adapter";
import { AiPlatformHttpGateway } from "../../infrastructure/http/ai-platform-http.gateway";
import { validateErpClassificationSuggestions } from "../../domain/use-cases/erp-classification-suggestion.validation";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";

export class ErpProductCatalogsRoutes {
  static routes(): Router {
    const router = Router();
    const catalogs = new ErpProductCatalogsAdapter(
      Envs.erpApiUrl,
      Envs.erpProductsBasePath,
      Envs.erpApiTimeoutMs,
      Envs.erpInternalApiKey,
    );
    const ai = new AiPlatformHttpGateway(Envs.aiPlatformBaseUrl, Envs.aiPlatformTimeoutMs, Envs.aiPlatformInternalApiKey);
    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), async (_req, res) => {
      try {
        res.status(200).json(await catalogs.list());
      } catch (error) {
        res.status(502).json({ error: error instanceof Error ? error.message : "No se pudo cargar el catálogo ERP." });
      }
    });
    router.post("/suggest", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), async (req, res) => {
      const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
      if (description.length < 5 || description.length > 5000) {
        res.status(400).json({ error: "La descripción debe tener entre 5 y 5000 caracteres." });
        return;
      }
      try {
        const catalog = await catalogs.list();
        const response = await ai.requestJson("/api/erp-product-classifications/suggest", "POST", {
          description,
          groups: catalog.groups.map((group) => ({
            code: group.code,
            label: group.label,
            options: group.options.map((option) => ({ code: option.code, description: option.description })),
          })),
        });
        if (response.status !== 200) throw new Error("No se pudo obtener la sugerencia de IA.");
        res.status(200).json({ suggestions: validateErpClassificationSuggestions(response.body, catalog, description) });
      } catch (error) {
        res.status(502).json({ error: error instanceof Error ? error.message : "No se pudo clasificar el producto." });
      }
    });
    return router;
  }
}
