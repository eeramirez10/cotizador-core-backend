import { Router } from "express";
import { Envs } from "../../config/envs";
import { FileAttachmentsUseCase } from "../../domain/use-cases/file-attachments.use-case";
import { PrismaFileAttachmentRepository } from "../../infrastructure/repositories/prisma-file-attachment.repository";
import { LocalFileStorageAdapter } from "../../infrastructure/storage/local-file-storage.adapter";
import { requireAuth } from "../middlewares/auth.middleware";
import { uploadSingleAttachment } from "../middlewares/file-upload.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { AttachmentsController } from "./attachments.controller";

export class AttachmentsRoutes {
  static routes(): Router {
    const router = Router();
    const controller = new AttachmentsController(
      new FileAttachmentsUseCase(
        new PrismaFileAttachmentRepository(),
        new LocalFileStorageAdapter(Envs.fileStorageRoot),
      ),
    );

    router.post("/quote-drafts/:clientDraftId/source", requireAuth, requireRoles("SELLER"), uploadSingleAttachment, controller.uploadQuoteSource);
    router.post("/quote-drafts/:clientDraftId/seller-quotes", requireAuth, requireRoles("SELLER"), uploadSingleAttachment, controller.uploadSellerQuote);
    router.get("/quote-drafts/:clientDraftId", requireAuth, requireRoles("SELLER"), controller.listQuoteDraft);
    router.get("/quotes/:quoteId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.listQuote);
    router.post("/purchase-requisitions/:requisitionId/offers", requireAuth, requireRoles("ADMIN", "PURCHASING"), uploadSingleAttachment, controller.uploadPurchaseOffer);
    router.get("/purchase-requisitions/:requisitionId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.listPurchaseRequisition);
    router.get("/:fileId/download", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER", "PURCHASING"), controller.download);
    router.delete("/:fileId", requireAuth, requireRoles("ADMIN", "SELLER", "PURCHASING"), controller.delete);

    return router;
  }
}
