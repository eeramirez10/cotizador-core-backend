import { Router } from "express";
import { Envs } from "../../config/envs";
import { requireAuth } from "../middlewares/auth.middleware";

// Only legacy browser lookups need this bridge. Internal keys never enter Vite.
export function stagingErpRoutes(): Router {
  const router = Router();
  if (process.env.STAGING_MODE !== "true") return router;
  router.use(requireAuth);
  router.use(async (req, res): Promise<void> => {
    const mappings: Array<[RegExp, string]> = [
      [/^\/products\/by-ean\/[^/]+\/branch\/[^/]+$/, "/api/erp/products"],
      [/^\/customers\/search$/, "/api/erp/customers"],
      [/^\/users(?:\/[^/]+)?\/?$/, "/api/erp-users"],
    ];
    const mapping = mappings.find(([pattern]) => pattern.test(req.path));
    if (req.method !== "GET" || !mapping || !Envs.erpInternalApiKey) {
      res.status(403).json({ error: "ERP staging only permits configured read-only lookups." });
      return;
    }
    const path = req.path.replace(/^\/(products|customers|users)/, mapping[1]);
    const url = new URL(path, Envs.erpApiUrl);
    url.search = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    try {
      const response = await fetch(url, {
        headers: { "x-internal-api-key": Envs.erpInternalApiKey },
        redirect: "error", signal: AbortSignal.timeout(Envs.erpApiTimeoutMs),
      });
      res.status(response.status).type("application/json").send(await response.text());
    } catch {
      res.status(503).json({ error: "ERP staging lookup unavailable." });
    }
  });
  return router;
}
