import { Router } from "express";
import { LocalProductProcurementUseCase } from "../../domain/use-cases/local-product-procurement.use-case";
import { PrismaLocalProductProcurementDatasource } from "../../infrastructure/datasources/prisma-local-product-procurement.datasource";
import { LocalProductProcurementRepositoryImpl } from "../../infrastructure/repositories/local-product-procurement.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { LocalProductProcurementController } from "./local-product-procurement.controller";

export class LocalProductProcurementRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new LocalProductProcurementRepositoryImpl(
      new PrismaLocalProductProcurementDatasource(),
    );
    const controller = new LocalProductProcurementController(
      new LocalProductProcurementUseCase(repository),
    );
    const access = [requireAuth, requireRoles("ADMIN", "MANAGER", "PURCHASING")] as const;

    router.get("/", ...access, controller.list);
    router.get("/:productId", ...access, controller.get);
    router.post("/:productId/offers", ...access, controller.createOffer);
    router.patch("/:productId/offers/:offerId", ...access, controller.updateOffer);
    router.delete("/offers/:offerId", ...access, controller.deactivateOffer);
    router.post("/:productId/offers/:offerId/select", ...access, controller.selectOffer);
    router.patch("/:productId/status", ...access, controller.changeStatus);
    return router;
  }
}
