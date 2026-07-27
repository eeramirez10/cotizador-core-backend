import { Router } from "express";
import { PurchaseRequisitionUseCase } from "../../domain/use-cases/purchase-requisition.use-case";
import { Envs } from "../../config/envs";
import { PrismaPurchaseRequisitionDatasource } from "../../infrastructure/datasources/prisma-purchase-requisition.datasource";
import { PrismaQuoteDatasource } from "../../infrastructure/datasources/prisma-quote.datasource";
import { GptLocalProductSemanticAdapter } from "../../infrastructure/http/gpt-local-product-semantic.adapter";
import { ErpProductLookupAdapter } from "../../infrastructure/http/erp-product-lookup.adapter";
import { ErpSupplierLookupAdapter } from "../../infrastructure/http/erp-supplier-lookup.adapter";
import { PurchaseRequisitionRepositoryImpl } from "../../infrastructure/repositories/purchase-requisition.repository-impl";
import { QuoteRepositoryImpl } from "../../infrastructure/repositories/quote.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { PurchaseRequisitionsController } from "./purchase-requisitions.controller";

export class PurchaseRequisitionsRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new PurchaseRequisitionRepositoryImpl(
      new PrismaPurchaseRequisitionDatasource(Envs.requisitionInternalApprovalEnabled)
    );
    const quoteRepository = new QuoteRepositoryImpl(new PrismaQuoteDatasource());
    const semanticAdapter = new GptLocalProductSemanticAdapter(
      Envs.gptLocalProductsUrl,
      Envs.gptLocalProductsTimeoutMs,
      Envs.gptLocalProductsApiKey,
    );
    const erpProductLookup = new ErpProductLookupAdapter(
      Envs.erpApiUrl,
      Envs.erpProductsBasePath,
      Envs.erpApiTimeoutMs,
    );
    const erpSupplierLookup = new ErpSupplierLookupAdapter(
      Envs.erpApiUrl,
      Envs.erpSuppliersBasePath,
      Envs.erpApiTimeoutMs,
      Envs.erpInternalApiKey,
    );
    const controller = new PurchaseRequisitionsController(
      new PurchaseRequisitionUseCase(repository, quoteRepository, semanticAdapter, erpProductLookup, erpSupplierLookup),
    );

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.list);
    router.get("/quote/:quoteId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.getByQuoteId);
    router.post("/from-quote/:quoteId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.createFromQuote);
    router.get("/suppliers", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.listSuppliers);
    router.get("/suppliers/erp/search", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.searchErpSuppliers);
    router.post("/suppliers/erp/sync", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.syncErpSupplier);
    router.post("/suppliers", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.createSupplier);
    router.patch("/suppliers/:supplierId", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.updateSupplier);
    router.get("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.getById);
    router.patch("/:id/items/:itemId", requireAuth, requireRoles("ADMIN", "SELLER", "PURCHASING"), controller.updateItem);
    router.post("/:id/items/:itemId/link-erp", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.linkItemToErp);
    router.post("/:id/submit", requireAuth, requireRoles("SELLER"), controller.submit);
    router.patch("/:id/assign", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.assign);
    router.post("/:id/items/:itemId/offers", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.createOffer);
    router.post("/:id/items/:itemId/offers/:offerId/select", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.selectOffer);
    router.post("/:id/approve-cost-variance", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.approveCostVariance);

    return router;
  }
}
