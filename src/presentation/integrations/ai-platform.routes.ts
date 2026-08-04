import { Router } from "express";
import { Envs } from "../../config/envs";
import { AiPlatformHttpGateway } from "../../infrastructure/http/ai-platform-http.gateway";
import { PrismaErpWarehouseDatasource } from "../../infrastructure/datasources/prisma-erp-warehouse.datasource";
import { ErpWarehouseRepositoryImpl } from "../../infrastructure/repositories/erp-warehouse.repository-impl";
import { ErpProductsSearchAdapter } from "../../infrastructure/http/erp-products-search.adapter";
import { ErpWarehouseAccessUseCase } from "../../domain/use-cases/erp-warehouse-access.use-case";
import { uploadSingleAiDocument } from "../middlewares/ai-platform-upload.middleware";
import { requireAuth } from "../middlewares/auth.middleware";
import { AiPlatformController } from "./ai-platform.controller";

export class AiPlatformRoutes {
  public static routes(): Router {
    const router = Router();
    const warehouseRepository = new ErpWarehouseRepositoryImpl(new PrismaErpWarehouseDatasource());
    const warehouseAccess = new ErpWarehouseAccessUseCase(
      warehouseRepository,
      new ErpProductsSearchAdapter(
        Envs.erpApiUrl,
        Envs.erpProductsBasePath,
        Envs.erpApiTimeoutMs,
        Envs.erpInternalApiKey,
      ),
    );
    const controller = new AiPlatformController(
      new AiPlatformHttpGateway(
        Envs.aiPlatformBaseUrl,
        Envs.aiPlatformTimeoutMs,
        Envs.aiPlatformInternalApiKey,
      ),
      warehouseAccess,
    );

    router.use(requireAuth);
    router.post("/extract/jobs", uploadSingleAiDocument, controller.createDocumentJob);
    router.post("/extract/jobs/quoted-excel", uploadSingleAiDocument, controller.createQuotedExcelJob);
    router.post("/extract/jobs/supplier-quote", uploadSingleAiDocument, controller.createSupplierQuoteJob);
    router.post("/extract/jobs/text", controller.createTextJob);
    router.get("/extract/jobs/:id/status", controller.jobStatus);
    router.get("/extract/jobs/:id/result", controller.jobResult);
    router.post("/products/normalize-missing", controller.normalizeMissingProducts);
    router.post("/procurement/technical-data/suggest", controller.suggestTechnicalData);
    router.post("/procurement/technical-data/suggest-batch", controller.suggestTechnicalDataBatch);
    router.post("/quote-catalogs/suggest-code", controller.suggestCatalogCode);
    router.post("/parties/extract", controller.extractPartyData);
    router.post("/ai/products/similar", controller.searchSimilar);
    router.post("/ai/products/similar-v2", controller.searchSimilarV2);
    router.post("/ai/products/similar-v2/semantic", controller.searchSimilarV2Semantic);

    return router;
  }
}
