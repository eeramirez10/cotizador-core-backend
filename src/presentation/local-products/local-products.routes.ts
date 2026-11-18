import { listLocalProductErpLinks } from "../../infrastructure/datasources/local-product-erp-links";
import { PrismaQuoteCatalogDatasource } from "../../infrastructure/datasources/prisma-quote-catalog.datasource";
import { Router } from "express";
import { CreateLocalProductsFromItemsUseCase } from "../../domain/use-cases/create-local-products-from-items.use-case";
import { CreateLocalTempProductUseCase } from "../../domain/use-cases/create-local-temp-product.use-case";
import { DeleteLocalTempProductUseCase } from "../../domain/use-cases/delete-local-temp-product.use-case";
import { GetProductsUseCase } from "../../domain/use-cases/get-products.use-case";
import { UpdateLocalTempProductUseCase } from "../../domain/use-cases/update-local-temp-product.use-case";
import { SearchSimilarLocalProductsUseCase } from "../../domain/use-cases/search-similar-local-products.use-case";
import { ReindexLocalProductsUseCase } from "../../domain/use-cases/reindex-local-products.use-case";
import { Envs } from "../../config/envs";
import { PrismaBranchDatasource } from "../../infrastructure/datasources/prisma-branch.datasource";
import { PrismaProductDatasource } from "../../infrastructure/datasources/prisma-product.datasource";
import { BranchRepositoryImpl } from "../../infrastructure/repositories/branch.repository-impl";
import { ProductRepositoryImpl } from "../../infrastructure/repositories/product.repository-impl";
import { GptLocalProductSemanticAdapter } from "../../infrastructure/http/gpt-local-product-semantic.adapter";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { LocalProductsController } from "./local-products.controller";

export class LocalProductsRoutes {
  static routes(): Router {
    const router = Router();

    const branchDatasource = new PrismaBranchDatasource();
    const productDatasource = new PrismaProductDatasource();

    const branchRepository = new BranchRepositoryImpl(branchDatasource);
    const units = new PrismaQuoteCatalogDatasource();
    const productRepository = new ProductRepositoryImpl(productDatasource);
    const semanticAdapter = new GptLocalProductSemanticAdapter(
      Envs.gptLocalProductsUrl,
      Envs.gptLocalProductsTimeoutMs,
      Envs.gptLocalProductsApiKey,
    );

    const getProductsUseCase = new GetProductsUseCase(productRepository, branchRepository);
    const createLocalTempProductUseCase = new CreateLocalTempProductUseCase(
      productRepository,
      branchRepository,
      semanticAdapter,
      units,
    );
    const createLocalProductsFromItemsUseCase = new CreateLocalProductsFromItemsUseCase(
      productRepository,
      branchRepository,
      semanticAdapter,
      units,
    );
    const updateLocalTempProductUseCase = new UpdateLocalTempProductUseCase(productRepository, semanticAdapter);
    const deleteLocalTempProductUseCase = new DeleteLocalTempProductUseCase(productRepository, semanticAdapter);
    const searchSimilarLocalProductsUseCase = new SearchSimilarLocalProductsUseCase(
      productRepository,
      semanticAdapter,
      Envs.localProductSemanticMinScore,
    );
    const reindexLocalProductsUseCase = new ReindexLocalProductsUseCase(productRepository, semanticAdapter);

    const controller = new LocalProductsController(
      getProductsUseCase,
      createLocalTempProductUseCase,
      createLocalProductsFromItemsUseCase,
      updateLocalTempProductUseCase,
      deleteLocalTempProductUseCase,
      searchSimilarLocalProductsUseCase,
      reindexLocalProductsUseCase,
    );

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.list);
    router.post("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.create);
    router.post("/similar", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.searchSimilar);
    router.post("/semantic/reindex", requireAuth, requireRoles("ADMIN"), controller.reindexSemantic);
    router.get("/:id/erp-links", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), async (req, res) => {
      if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
      const id = String(req.params.id);
      if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return void res.status(400).json({ error: "Producto no válido." });
      try {
        const result = await listLocalProductErpLinks(id, req.user, req.query.includeRequisitions === "true");
        if (!result) return void res.status(404).json({ error: "Producto local no encontrado." });
        res.json(result);
      } catch {
        res.status(500).json({ error: "No se pudieron consultar los vínculos ERP." });
      }
    });
    router.patch(
      "/:id",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.update
    );
    router.delete(
      "/:id",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.remove
    );
    router.post(
      "/batch-from-items",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.createFromItems
    );

    return router;
  }
}
