import { Router } from "express";
import { Envs } from "../../config/envs";
import { ErpWarehouseAccessUseCase } from "../../domain/use-cases/erp-warehouse-access.use-case";
import { PrismaErpWarehouseDatasource } from "../../infrastructure/datasources/prisma-erp-warehouse.datasource";
import { ErpProductsSearchAdapter } from "../../infrastructure/http/erp-products-search.adapter";
import { ErpWarehouseRepositoryImpl } from "../../infrastructure/repositories/erp-warehouse.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { ErpWarehousesController } from "./erp-warehouses.controller";

export class ErpWarehousesRoutes {
  static managementRoutes(): Router {
    const router = Router();
    const controller = this.controller();

    router.get("/", requireAuth, requireRoles("ADMIN"), controller.list);
    router.post("/", requireAuth, requireRoles("ADMIN"), controller.create);
    router.patch("/:id", requireAuth, requireRoles("ADMIN"), controller.update);
    router.get("/branches/:branchId", requireAuth, requireRoles("ADMIN"), controller.getBranchAccess);
    router.put("/branches/:branchId", requireAuth, requireRoles("ADMIN"), controller.replaceBranchAccess);
    router.get("/users/:userId", requireAuth, requireRoles("ADMIN"), controller.getUserAccess);
    router.put("/users/:userId", requireAuth, requireRoles("ADMIN"), controller.replaceUserAccess);
    router.get("/me/effective", requireAuth, controller.getMyEffectiveAccess);
    return router;
  }

  static productRoutes(): Router {
    const router = Router();
    const controller = this.controller();
    router.get("/search", requireAuth, requireRoles("SELLER"), controller.searchProducts);
    return router;
  }

  private static controller(): ErpWarehousesController {
    const repository = new ErpWarehouseRepositoryImpl(new PrismaErpWarehouseDatasource());
    const productSearch = new ErpProductsSearchAdapter(
      Envs.erpApiUrl,
      Envs.erpProductsBasePath,
      Envs.erpApiTimeoutMs,
      Envs.erpInternalApiKey,
    );
    return new ErpWarehousesController(new ErpWarehouseAccessUseCase(repository, productSearch));
  }
}
