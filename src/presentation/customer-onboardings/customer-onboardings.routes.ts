import { Router } from "express";
import multer from "multer";
import { CustomerOnboardingUseCase } from "../../domain/use-cases/customer-onboarding.use-case";
import { Envs } from "../../config/envs";
import { LocalFileStorageAdapter } from "../../infrastructure/storage/local-file-storage.adapter";
import { AiPlatformCustomerTaxDocumentExtractorAdapter } from "../../infrastructure/http/ai-platform-customer-tax-document-extractor.adapter";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { CustomerOnboardingsController } from "./customer-onboardings.controller";

export class CustomerOnboardingsRoutes {
  static routes(): Router {
    const router = Router();
    const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: Envs.aiPlatformMaxUploadMb * 1024 * 1024 } });
    const controller = new CustomerOnboardingsController(new CustomerOnboardingUseCase(
      new LocalFileStorageAdapter(Envs.fileStorageRoot),
      new AiPlatformCustomerTaxDocumentExtractorAdapter(Envs.aiPlatformBaseUrl, Envs.aiPlatformInternalApiKey, Envs.aiPlatformTimeoutMs),
    ));
    router.post("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.create);
    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.list);
    router.get("/conversation/:conversationId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.getForConversation);
    router.post("/conversation/:conversationId/tax-document/:attachmentId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.processConversationTaxDocument);
    router.get("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.get);
    router.patch("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.update);
    router.post("/:id/tax-document", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), upload.single("file"), controller.uploadTaxDocument);
    router.get("/:id/tax-document", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.downloadTaxDocument);
    router.post("/:id/submit-for-cxc", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.submitForCxc);
    router.post("/:id/approve-for-erp", requireAuth, requireRoles("ADMIN"), controller.approveForErp);
    router.post("/:id/mark-erp-linked", requireAuth, requireRoles("ADMIN"), controller.markErpLinked);
    return router;
  }
}
