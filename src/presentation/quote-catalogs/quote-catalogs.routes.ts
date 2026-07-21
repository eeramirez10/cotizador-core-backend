import { Router } from "express";
import { QuoteCatalogOptionsUseCase } from "../../domain/use-cases/quote-catalog-options.use-case";
import { PrismaQuoteCatalogDatasource } from "../../infrastructure/datasources/prisma-quote-catalog.datasource";
import { QuoteCatalogRepositoryImpl } from "../../infrastructure/repositories/quote-catalog.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { QuoteCatalogsController } from "./quote-catalogs.controller";

export class QuoteCatalogsRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new QuoteCatalogRepositoryImpl(new PrismaQuoteCatalogDatasource());
    const controller = new QuoteCatalogsController(new QuoteCatalogOptionsUseCase(repository));

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.listAvailable);
    router.get("/manage", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.listManaged);
    router.post("/", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.create);
    router.patch("/:id", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.update);
    router.patch("/:id/deactivate", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.deactivate);
    return router;
  }
}
