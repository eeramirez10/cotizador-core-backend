import { Router } from "express";
import { PurchaseRequisitionUseCase } from "../../domain/use-cases/purchase-requisition.use-case";
import { ErpDraftAccessError, PurchaseItemErpDraftUseCase } from "../../domain/use-cases/purchase-item-erp-draft.use-case";
import { Envs } from "../../config/envs";
import { runtimeSystemSettings } from "../../infrastructure/config/runtime-system-settings";
import { PrismaPurchaseRequisitionDatasource } from "../../infrastructure/datasources/prisma-purchase-requisition.datasource";
import { PrismaQuoteDatasource } from "../../infrastructure/datasources/prisma-quote.datasource";
import { GptLocalProductSemanticAdapter } from "../../infrastructure/http/gpt-local-product-semantic.adapter";
import { ErpProductLookupAdapter } from "../../infrastructure/http/erp-product-lookup.adapter";
import { ErpSupplierLookupAdapter } from "../../infrastructure/http/erp-supplier-lookup.adapter";
import { PurchaseRequisitionRepositoryImpl } from "../../infrastructure/repositories/purchase-requisition.repository-impl";
import { PrismaPurchaseItemErpDraftRepository } from "../../infrastructure/repositories/prisma-purchase-item-erp-draft.repository";
import { LocalFileStorageAdapter } from "../../infrastructure/storage/local-file-storage.adapter";
import { PrismaPurchasePriceNotificationAdapter } from "../../infrastructure/notifications/prisma-purchase-price-notification.adapter";
import { whatsAppRealtimeBus } from "../../infrastructure/realtime/whatsapp-realtime.container";
import { QuoteRepositoryImpl } from "../../infrastructure/repositories/quote.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { PurchaseRequisitionsController } from "./purchase-requisitions.controller";

export class PurchaseRequisitionsRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new PurchaseRequisitionRepositoryImpl(
      new PrismaPurchaseRequisitionDatasource(
        () => runtimeSystemSettings.boolean("REQUISITION_INTERNAL_APPROVAL_ENABLED"),
        () => runtimeSystemSettings.boolean("LOCAL_PURCHASE_WITHOUT_ERP_CODE_ENABLED"),
      )
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
      new PurchaseRequisitionUseCase(repository, quoteRepository, semanticAdapter, erpProductLookup, erpSupplierLookup, new LocalFileStorageAdapter(Envs.fileStorageRoot), new PrismaPurchasePriceNotificationAdapter(whatsAppRealtimeBus)),
    );
    const erpDraft = new PurchaseItemErpDraftUseCase(repository, new PrismaPurchaseItemErpDraftRepository());
    const erpDraftHandler = (write: boolean) => async (req: import("express").Request, res: import("express").Response) => {
      if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
      const id = String(req.params.id || "");
      const itemId = String(req.params.itemId || "");
      try {
        const result = write
          ? await erpDraft.save(id, itemId, req.body?.data, req.user)
          : await erpDraft.get(id, itemId, req.user);
        res.status(200).json(result);
      } catch (error) {
        if (error instanceof ErpDraftAccessError) return void res.status(error.status).json({ error: error.message });
        res.status(500).json({ error: "No se pudo consultar o guardar la ficha ERP." });
      }
    };

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.list);
    router.get("/quote/:quoteId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.getByQuoteId);
    router.get("/quote/:quoteId/buyers", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.listBuyersForQuote);
    router.post("/quote/:quoteId/send-to-purchasing", requireAuth, requireRoles("SELLER"), controller.sendUnquotedItemsToPurchasing);
    router.post("/quote/:quoteId/finalize-prices", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.finalizePricesForQuote);
    router.post("/from-quote/:quoteId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.createFromQuote);
    router.get("/suppliers", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.listSuppliers);
    router.get("/suppliers/erp/search", requireAuth, requireRoles("ADMIN", "SELLER", "PURCHASING"), controller.searchErpSuppliers);
    router.post("/suppliers/erp/sync", requireAuth, requireRoles("ADMIN", "SELLER", "PURCHASING"), controller.syncErpSupplier);
    router.post("/suppliers", requireAuth, requireRoles("ADMIN", "SELLER", "PURCHASING"), controller.createSupplier);
    router.patch("/suppliers/:supplierId", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.updateSupplier);
    router.patch("/suppliers/:supplierId/status", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.setSupplierActive);
    router.get("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.getById);
    router.get("/:id/items/:itemId/erp-draft", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), erpDraftHandler(false));
    router.put("/:id/items/:itemId/erp-draft", requireAuth, requireRoles("ADMIN", "SELLER", "PURCHASING"), erpDraftHandler(true));
    router.delete("/:id", requireAuth, requireRoles("ADMIN"), controller.deletePermanently);
    router.get("/:id/buyers", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.listBuyers);
    router.patch("/:id/document", requireAuth, requireRoles("ADMIN", "SELLER", "PURCHASING"), controller.updateDocument);
    router.patch("/:id/items/:itemId", requireAuth, requireRoles("ADMIN", "SELLER", "PURCHASING"), controller.updateItem);
    router.post("/:id/items/:itemId/link-erp", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.linkItemToErp);
    router.post("/:id/submit", requireAuth, requireRoles("SELLER"), controller.submit);
    router.patch("/:id/assign", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.assign);
    router.post("/:id/items/:itemId/offers", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.createOffer);
    router.post("/:id/offers/batch", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.createOffersBatch);
    router.put("/:id/supplier-quotes/:supplierQuoteId/offers", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.updateOffersBatch);
    router.patch("/:id/items/:itemId/offers/:offerId/code", requireAuth, requireRoles("ADMIN", "SELLER", "PURCHASING"), controller.updateSupplierCode);
    router.post("/:id/items/:itemId/offers/:offerId/select", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.selectOffer);
    router.put("/:id/items/:itemId/allocations", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.allocateOffers);
    router.post("/:id/supplier-requisitions", requireAuth, requireRoles("ADMIN", "PURCHASING"), controller.generateSupplierRequisitions);
    router.post("/:id/approve-cost-variance", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.approveCostVariance);

    return router;
  }
}
