import { Router } from "express";
import { Envs } from "../../config/envs";
import { AddQuoteItemUseCase } from "../../domain/use-cases/add-quote-item.use-case";
import { ChangeQuoteStatusUseCase } from "../../domain/use-cases/change-quote-status.use-case";
import { ArchiveQuoteUseCase } from "../../domain/use-cases/archive-quote.use-case";
import { RestoreQuoteUseCase } from "../../domain/use-cases/restore-quote.use-case";
import { DeleteQuoteUseCase } from "../../domain/use-cases/delete-quote.use-case";
import { CreateQuoteUseCase } from "../../domain/use-cases/create-quote.use-case";
import { CreateQuoteRevisionUseCase } from "../../domain/use-cases/create-quote-revision.use-case";
import { CreateQuoteFromExtractionUseCase } from "../../domain/use-cases/create-quote-from-extraction.use-case";
import { DeleteQuoteItemUseCase } from "../../domain/use-cases/delete-quote-item.use-case";
import { DownloadQuoteOrderFileUseCase } from "../../domain/use-cases/download-quote-order-file.use-case";
import { GenerateQuoteOrderUseCase } from "../../domain/use-cases/generate-quote-order.use-case";
import { GetQuoteByIdUseCase } from "../../domain/use-cases/get-quote-by-id.use-case";
import { GetQuoteCustomerChangeRequestsUseCase } from "../../domain/use-cases/get-quote-customer-change-requests.use-case";
import { GetQuotesUseCase } from "../../domain/use-cases/get-quotes.use-case";
import { MatchQuoteItemErpUseCase } from "../../domain/use-cases/match-quote-item-erp.use-case";
import { RegisterQuoteDeliveryAttemptUseCase } from "../../domain/use-cases/register-quote-delivery-attempt.use-case";
import { RegisterErpQuoteUseCase } from "../../domain/use-cases/register-erp-quote.use-case";
import { RegisterErpOrderUseCase } from "../../domain/use-cases/register-erp-order.use-case";
import { SaveQuoteDraftUseCase } from "../../domain/use-cases/save-quote-draft.use-case";
import { UpdateQuoteItemUseCase } from "../../domain/use-cases/update-quote-item.use-case";
import { UpdateQuoteProcurementReferenceUseCase } from "../../domain/use-cases/update-quote-procurement-reference.use-case";
import { UpdateQuoteUseCase } from "../../domain/use-cases/update-quote.use-case";
import { PrismaBranchDatasource } from "../../infrastructure/datasources/prisma-branch.datasource";
import { PrismaCustomerDatasource } from "../../infrastructure/datasources/prisma-customer.datasource";
import { PrismaQuoteCatalogDatasource } from "../../infrastructure/datasources/prisma-quote-catalog.datasource";
import { FileOrderGenerationDatasource } from "../../infrastructure/datasources/file-order-generation.datasource";
import { PrismaQuoteDatasource } from "../../infrastructure/datasources/prisma-quote.datasource";
import { PrismaUserDatasource } from "../../infrastructure/datasources/prisma-user.datasource";
import { PrismaPurchaseRequisitionDatasource } from "../../infrastructure/datasources/prisma-purchase-requisition.datasource";
import { BranchRepositoryImpl } from "../../infrastructure/repositories/branch.repository-impl";
import { CustomerRepositoryImpl } from "../../infrastructure/repositories/customer.repository-impl";
import { OrderGenerationRepositoryImpl } from "../../infrastructure/repositories/order-generation.repository-impl";
import { QuoteRepositoryImpl } from "../../infrastructure/repositories/quote.repository-impl";
import { QuoteCatalogRepositoryImpl } from "../../infrastructure/repositories/quote-catalog.repository-impl";
import { UserRepositoryImpl } from "../../infrastructure/repositories/user.repository-impl";
import { PurchaseRequisitionRepositoryImpl } from "../../infrastructure/repositories/purchase-requisition.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { QuotesController } from "./quotes.controller";
import { FileAttachmentsUseCase } from "../../domain/use-cases/file-attachments.use-case";
import { PrismaFileAttachmentRepository } from "../../infrastructure/repositories/prisma-file-attachment.repository";
import { LocalFileStorageAdapter } from "../../infrastructure/storage/local-file-storage.adapter";
import { HmacQuoteDocumentLinkAdapter } from "../../infrastructure/security/hmac-quote-document-link.adapter";
import { TwilioQuoteMessagingAdapter } from "../../infrastructure/messaging/twilio-quote-messaging.adapter";
import { SendQuoteWhatsAppUseCase } from "../../domain/use-cases/send-quote-whatsapp.use-case";
import { GetWhatsAppConversationWindowUseCase } from "../../domain/use-cases/get-whatsapp-conversation-window.use-case";
import { PrismaWhatsAppConversationRepository } from "../../infrastructure/repositories/prisma-whatsapp-conversation.repository";
import { PrismaWhatsAppAssistantRepository } from "../../infrastructure/repositories/prisma-whatsapp-assistant.repository";
import { PrismaWhatsAppInboxRepository } from "../../infrastructure/repositories/prisma-whatsapp-inbox.repository";
import { whatsAppRealtimeBus } from "../../infrastructure/realtime/whatsapp-realtime.container";
import { composeWhatsAppInternalAlert } from "../composition/whatsapp-internal-alert.composition";
import { uploadSingleAttachment } from "../middlewares/file-upload.middleware";
import { QuoteCustomerChangeRequestsController } from "./quote-customer-change-requests.controller";
import { runtimeSystemSettings } from "../../infrastructure/config/runtime-system-settings";
import { ErpQuoteLookupAdapter } from "../../infrastructure/http/erp-quote-lookup.adapter";
import { ErpOrderLookupAdapter } from "../../infrastructure/http/erp-order-lookup.adapter";

export class QuotesRoutes {
  static routes(): Router {
    const router = Router();

    const branchDatasource = new PrismaBranchDatasource();
    const customerDatasource = new PrismaCustomerDatasource();
    const quoteDatasource = new PrismaQuoteDatasource();
    const userDatasource = new PrismaUserDatasource();
    const orderGenerationDatasource = new FileOrderGenerationDatasource();

    const branchRepository = new BranchRepositoryImpl(branchDatasource);
    const customerRepository = new CustomerRepositoryImpl(customerDatasource);
    const quoteRepository = new QuoteRepositoryImpl(quoteDatasource);
    const quoteCatalogRepository = new QuoteCatalogRepositoryImpl(new PrismaQuoteCatalogDatasource());
    const userRepository = new UserRepositoryImpl(userDatasource);
    const orderGenerationRepository = new OrderGenerationRepositoryImpl(orderGenerationDatasource);
    const purchaseRequisitionRepository = new PurchaseRequisitionRepositoryImpl(
      new PrismaPurchaseRequisitionDatasource(() => runtimeSystemSettings.boolean("REQUISITION_INTERNAL_APPROVAL_ENABLED"))
    );

    const createQuoteUseCase = new CreateQuoteUseCase(
      quoteRepository,
      customerRepository,
      branchRepository,
      userRepository,
      () => runtimeSystemSettings.boolean("SELLER_EXCEL_IMPORT_ENABLED")
    );
    const saveQuoteDraftUseCase = new SaveQuoteDraftUseCase(
      quoteRepository,
      customerRepository,
      userRepository,
      () => runtimeSystemSettings.boolean("QUOTE_INTERNAL_APPROVAL_ENABLED"),
      () => runtimeSystemSettings.boolean("SELLER_EXCEL_IMPORT_ENABLED")
    );
    const createQuoteFromExtractionUseCase = new CreateQuoteFromExtractionUseCase(
      quoteRepository,
      customerRepository,
      branchRepository,
      userRepository,
      () => runtimeSystemSettings.boolean("SELLER_EXCEL_IMPORT_ENABLED")
    );
    const createQuoteRevisionUseCase = new CreateQuoteRevisionUseCase(quoteRepository, quoteCatalogRepository);
    const archiveQuoteUseCase = new ArchiveQuoteUseCase(quoteRepository);
    const restoreQuoteUseCase = new RestoreQuoteUseCase(quoteRepository);
    const deleteQuoteUseCase = new DeleteQuoteUseCase(quoteRepository);
    const getQuotesUseCase = new GetQuotesUseCase(quoteRepository, branchRepository);
    const getQuoteByIdUseCase = new GetQuoteByIdUseCase(quoteRepository);
    const updateQuoteUseCase = new UpdateQuoteUseCase(quoteRepository, customerRepository, userRepository);
    const addQuoteItemUseCase = new AddQuoteItemUseCase(quoteRepository);
    const matchQuoteItemErpUseCase = new MatchQuoteItemErpUseCase(quoteRepository);
    const updateQuoteItemUseCase = new UpdateQuoteItemUseCase(quoteRepository);
    const updateQuoteProcurementReferenceUseCase = new UpdateQuoteProcurementReferenceUseCase(
      quoteRepository,
      purchaseRequisitionRepository,
    );
    const deleteQuoteItemUseCase = new DeleteQuoteItemUseCase(quoteRepository);
    const changeQuoteStatusUseCase = new ChangeQuoteStatusUseCase(
      quoteRepository,
      quoteCatalogRepository,
      purchaseRequisitionRepository,
      () => runtimeSystemSettings.boolean("QUOTE_INTERNAL_APPROVAL_ENABLED"),
      whatsAppRealtimeBus,
      composeWhatsAppInternalAlert(),
    );
    const registerQuoteDeliveryAttemptUseCase = new RegisterQuoteDeliveryAttemptUseCase(quoteRepository);
    const registerErpQuoteUseCase = new RegisterErpQuoteUseCase(
      quoteRepository,
      customerRepository,
      new ErpQuoteLookupAdapter(Envs.erpApiUrl, Envs.erpApiTimeoutMs, Envs.erpInternalApiKey),
    );
    const registerErpOrderUseCase = new RegisterErpOrderUseCase(
      quoteRepository,
      customerRepository,
      new ErpOrderLookupAdapter(Envs.erpApiUrl, Envs.erpApiTimeoutMs, Envs.erpInternalApiKey),
    );
    const fileAttachmentRepository = new PrismaFileAttachmentRepository();
    const fileAttachmentsUseCase = new FileAttachmentsUseCase(
      fileAttachmentRepository,
      new LocalFileStorageAdapter(Envs.fileStorageRoot),
    );
    const whatsAppInboxRepository = new PrismaWhatsAppInboxRepository();
    const whatsAppConversationWindow = new GetWhatsAppConversationWindowUseCase(
      new PrismaWhatsAppConversationRepository(),
      Envs.twilioWhatsAppFrom,
    );
    const sendQuoteWhatsAppUseCase = new SendQuoteWhatsAppUseCase(
      quoteRepository,
      customerRepository,
      fileAttachmentsUseCase,
      new TwilioQuoteMessagingAdapter({
        enabled: Envs.twilioWhatsAppEnabled,
        accountSid: Envs.twilioAccountSid,
        authToken: Envs.twilioAuthToken,
        from: Envs.twilioWhatsAppFrom,
        contentSid: Envs.twilioQuoteContentSid,
        mediaVariable: Envs.twilioQuoteMediaVariable,
        publicApiUrl: Envs.publicApiUrl,
        statusCallbackUrl: Envs.twilioStatusCallbackUrl,
      }),
      new HmacQuoteDocumentLinkAdapter(
        Envs.quoteDocumentSigningSecret,
        Envs.quoteDocumentUrlTtlSeconds,
      ),
      whatsAppConversationWindow,
      whatsAppInboxRepository,
      Envs.twilioWhatsAppFrom,
      whatsAppRealtimeBus,
    );
    const downloadQuoteOrderFileUseCase = new DownloadQuoteOrderFileUseCase(
      quoteRepository,
      orderGenerationRepository
    );
    const generateQuoteOrderUseCase = new GenerateQuoteOrderUseCase(
      quoteRepository,
      orderGenerationRepository,
      purchaseRequisitionRepository,
      () => runtimeSystemSettings.boolean("ORDER_FILE_WITHOUT_STOCK_ENABLED"),
      () => runtimeSystemSettings.boolean("ORDER_FILE_WITH_LOCAL_CUSTOMER_ENABLED"),
    );

    const controller = new QuotesController(
      createQuoteUseCase,
      saveQuoteDraftUseCase,
      createQuoteFromExtractionUseCase,
      createQuoteRevisionUseCase,
      archiveQuoteUseCase,
      restoreQuoteUseCase,
      deleteQuoteUseCase,
      getQuotesUseCase,
      getQuoteByIdUseCase,
      updateQuoteUseCase,
      addQuoteItemUseCase,
      matchQuoteItemErpUseCase,
      updateQuoteItemUseCase,
      updateQuoteProcurementReferenceUseCase,
      deleteQuoteItemUseCase,
      changeQuoteStatusUseCase,
      registerQuoteDeliveryAttemptUseCase,
      downloadQuoteOrderFileUseCase,
      generateQuoteOrderUseCase,
      registerErpQuoteUseCase,
      registerErpOrderUseCase,
      sendQuoteWhatsAppUseCase
    );
    const changeRequestsController = new QuoteCustomerChangeRequestsController(
      new GetQuoteCustomerChangeRequestsUseCase(quoteRepository, new PrismaWhatsAppAssistantRepository()),
    );

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.list);
    router.put(
      "/drafts/:clientDraftId",
      requireAuth,
      requireRoles("SELLER"),
      controller.saveDraft
    );
    router.get(
      "/:id/customer-change-requests",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      changeRequestsController.list,
    );
    router.get("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.getById);
    router.post("/", requireAuth, requireRoles("SELLER"), controller.create);
    router.post(
      "/from-extraction",
      requireAuth,
      requireRoles("SELLER"),
      controller.createFromExtraction
    );
    router.post("/:id/revisions", requireAuth, requireRoles("SELLER"), controller.createRevision);
    router.patch("/:id/archive", requireAuth, requireRoles("ADMIN"), controller.archive);
    router.patch("/:id/restore", requireAuth, requireRoles("ADMIN"), controller.restore);
    router.delete("/:id", requireAuth, requireRoles("ADMIN"), controller.deletePermanently);
    router.patch("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.update);

    router.post("/:id/items", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.addItem);
    router.patch(
      "/:id/items/:itemId/match-erp",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.matchItemErp
    );
    router.patch(
      "/:id/items/:itemId/procurement-reference",
      requireAuth,
      requireRoles("SELLER"),
      controller.updateProcurementReference
    );
    router.patch(
      "/:id/items/:itemId",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.updateItem
    );
    router.delete(
      "/:id/items/:itemId",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.removeItem
    );

    router.patch(
      "/:id/status",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.changeStatus
    );
    router.patch(
      "/:id/erp-registration",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.registerErpQuote
    );
    router.patch(
      "/:id/erp-order",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.registerErpOrder
    );
    router.post(
      "/:id/delivery-attempts",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.registerDeliveryAttempt
    );
    router.post(
      "/:id/deliveries/whatsapp",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      uploadSingleAttachment,
      controller.sendWhatsApp
    );
    router.post(
      "/:id/generate-order",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.generateOrder
    );
    router.get(
      "/:id/order-file",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.downloadOrderFile
    );

    return router;
  }
}
