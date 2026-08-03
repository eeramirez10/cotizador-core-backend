import { Router } from "express";
import { Envs } from "../../config/envs";
import { AiPlatformHttpGateway } from "../../infrastructure/http/ai-platform-http.gateway";
import { requireAuth } from "../middlewares/auth.middleware";
import { uploadSingleAttachment } from "../middlewares/file-upload.middleware";
import { AiPlatformController } from "./ai-platform.controller";

export class AiPlatformRoutes {
  public static routes(): Router {
    const router = Router();
    const controller = new AiPlatformController(new AiPlatformHttpGateway(
      Envs.aiPlatformBaseUrl,
      Envs.aiPlatformTimeoutMs,
      Envs.aiPlatformInternalApiKey,
    ));

    router.use(requireAuth);
    router.post("/extract/jobs", uploadSingleAttachment, controller.createDocumentJob);
    router.post("/extract/jobs/quoted-excel", uploadSingleAttachment, controller.createQuotedExcelJob);
    router.post("/extract/jobs/supplier-quote", uploadSingleAttachment, controller.createSupplierQuoteJob);
    router.post("/extract/jobs/text", controller.createTextJob);
    router.get("/extract/jobs/:id/status", controller.jobStatus);
    router.get("/extract/jobs/:id/result", controller.jobResult);
    router.post("/products/normalize-missing", controller.normalizeMissingProducts);
    router.post("/procurement/technical-data/suggest", controller.suggestTechnicalData);
    router.post("/procurement/technical-data/suggest-batch", controller.suggestTechnicalDataBatch);
    router.post("/quote-catalogs/suggest-code", controller.suggestCatalogCode);
    router.post("/ai/products/similar", controller.searchSimilar);
    router.post("/ai/products/similar-v2", controller.searchSimilarV2);
    router.post("/ai/products/similar-v2/semantic", controller.searchSimilarV2Semantic);

    return router;
  }
}
