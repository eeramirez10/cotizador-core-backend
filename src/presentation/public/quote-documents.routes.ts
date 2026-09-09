import { Router } from "express";
import { Envs } from "../../config/envs";
import { FileAttachmentsUseCase } from "../../domain/use-cases/file-attachments.use-case";
import { PrismaFileAttachmentRepository } from "../../infrastructure/repositories/prisma-file-attachment.repository";
import { HmacQuoteDocumentLinkAdapter } from "../../infrastructure/security/hmac-quote-document-link.adapter";
import { LocalFileStorageAdapter } from "../../infrastructure/storage/local-file-storage.adapter";
import { QuoteDocumentsController } from "./quote-documents.controller";

export class QuoteDocumentsRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new PrismaFileAttachmentRepository();
    const controller = new QuoteDocumentsController(
      new HmacQuoteDocumentLinkAdapter(
        Envs.quoteDocumentSigningSecret,
        Envs.quoteDocumentUrlTtlSeconds,
      ),
      new FileAttachmentsUseCase(repository, new LocalFileStorageAdapter(Envs.fileStorageRoot)),
    );
    router.get("/sample.pdf", controller.sample);
    router.get("/:token/:fileName", controller.download);
    router.get("/:token", controller.download);
    return router;
  }
}
