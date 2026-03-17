import { Router } from "express";
import { AddQuoteItemUseCase } from "../../domain/use-cases/add-quote-item.use-case";
import { ChangeQuoteStatusUseCase } from "../../domain/use-cases/change-quote-status.use-case";
import { CreateQuoteUseCase } from "../../domain/use-cases/create-quote.use-case";
import { CreateQuoteFromExtractionUseCase } from "../../domain/use-cases/create-quote-from-extraction.use-case";
import { DeleteQuoteItemUseCase } from "../../domain/use-cases/delete-quote-item.use-case";
import { DownloadQuoteOrderFileUseCase } from "../../domain/use-cases/download-quote-order-file.use-case";
import { GenerateQuoteOrderUseCase } from "../../domain/use-cases/generate-quote-order.use-case";
import { GetQuoteByIdUseCase } from "../../domain/use-cases/get-quote-by-id.use-case";
import { GetQuotesUseCase } from "../../domain/use-cases/get-quotes.use-case";
import { MatchQuoteItemErpUseCase } from "../../domain/use-cases/match-quote-item-erp.use-case";
import { RegisterQuoteDeliveryAttemptUseCase } from "../../domain/use-cases/register-quote-delivery-attempt.use-case";
import { UpdateQuoteItemUseCase } from "../../domain/use-cases/update-quote-item.use-case";
import { UpdateQuoteUseCase } from "../../domain/use-cases/update-quote.use-case";
import { PrismaBranchDatasource } from "../../infrastructure/datasources/prisma-branch.datasource";
import { PrismaCustomerDatasource } from "../../infrastructure/datasources/prisma-customer.datasource";
import { FileOrderGenerationDatasource } from "../../infrastructure/datasources/file-order-generation.datasource";
import { PrismaQuoteDatasource } from "../../infrastructure/datasources/prisma-quote.datasource";
import { BranchRepositoryImpl } from "../../infrastructure/repositories/branch.repository-impl";
import { CustomerRepositoryImpl } from "../../infrastructure/repositories/customer.repository-impl";
import { OrderGenerationRepositoryImpl } from "../../infrastructure/repositories/order-generation.repository-impl";
import { QuoteRepositoryImpl } from "../../infrastructure/repositories/quote.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { QuotesController } from "./quotes.controller";

export class QuotesRoutes {
  static routes(): Router {
    const router = Router();

    const branchDatasource = new PrismaBranchDatasource();
    const customerDatasource = new PrismaCustomerDatasource();
    const quoteDatasource = new PrismaQuoteDatasource();
    const orderGenerationDatasource = new FileOrderGenerationDatasource();

    const branchRepository = new BranchRepositoryImpl(branchDatasource);
    const customerRepository = new CustomerRepositoryImpl(customerDatasource);
    const quoteRepository = new QuoteRepositoryImpl(quoteDatasource);
    const orderGenerationRepository = new OrderGenerationRepositoryImpl(orderGenerationDatasource);

    const createQuoteUseCase = new CreateQuoteUseCase(quoteRepository, customerRepository, branchRepository);
    const createQuoteFromExtractionUseCase = new CreateQuoteFromExtractionUseCase(
      quoteRepository,
      customerRepository,
      branchRepository
    );
    const getQuotesUseCase = new GetQuotesUseCase(quoteRepository, branchRepository);
    const getQuoteByIdUseCase = new GetQuoteByIdUseCase(quoteRepository);
    const updateQuoteUseCase = new UpdateQuoteUseCase(quoteRepository, customerRepository);
    const addQuoteItemUseCase = new AddQuoteItemUseCase(quoteRepository);
    const matchQuoteItemErpUseCase = new MatchQuoteItemErpUseCase(quoteRepository);
    const updateQuoteItemUseCase = new UpdateQuoteItemUseCase(quoteRepository);
    const deleteQuoteItemUseCase = new DeleteQuoteItemUseCase(quoteRepository);
    const changeQuoteStatusUseCase = new ChangeQuoteStatusUseCase(quoteRepository);
    const registerQuoteDeliveryAttemptUseCase = new RegisterQuoteDeliveryAttemptUseCase(quoteRepository);
    const downloadQuoteOrderFileUseCase = new DownloadQuoteOrderFileUseCase(
      quoteRepository,
      orderGenerationRepository
    );
    const generateQuoteOrderUseCase = new GenerateQuoteOrderUseCase(
      quoteRepository,
      orderGenerationRepository
    );

    const controller = new QuotesController(
      createQuoteUseCase,
      createQuoteFromExtractionUseCase,
      getQuotesUseCase,
      getQuoteByIdUseCase,
      updateQuoteUseCase,
      addQuoteItemUseCase,
      matchQuoteItemErpUseCase,
      updateQuoteItemUseCase,
      deleteQuoteItemUseCase,
      changeQuoteStatusUseCase,
      registerQuoteDeliveryAttemptUseCase,
      downloadQuoteOrderFileUseCase,
      generateQuoteOrderUseCase
    );

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.list);
    router.get("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.getById);
    router.post("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.create);
    router.post(
      "/from-extraction",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.createFromExtraction
    );
    router.patch("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.update);

    router.post("/:id/items", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.addItem);
    router.patch(
      "/:id/items/:itemId/match-erp",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.matchItemErp
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
    router.post(
      "/:id/delivery-attempts",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.registerDeliveryAttempt
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
