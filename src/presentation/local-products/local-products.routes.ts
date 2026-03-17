import { Router } from "express";
import { CreateLocalProductsFromItemsUseCase } from "../../domain/use-cases/create-local-products-from-items.use-case";
import { CreateLocalTempProductUseCase } from "../../domain/use-cases/create-local-temp-product.use-case";
import { DeleteLocalTempProductUseCase } from "../../domain/use-cases/delete-local-temp-product.use-case";
import { GetProductsUseCase } from "../../domain/use-cases/get-products.use-case";
import { UpdateLocalTempProductUseCase } from "../../domain/use-cases/update-local-temp-product.use-case";
import { PrismaBranchDatasource } from "../../infrastructure/datasources/prisma-branch.datasource";
import { PrismaProductDatasource } from "../../infrastructure/datasources/prisma-product.datasource";
import { BranchRepositoryImpl } from "../../infrastructure/repositories/branch.repository-impl";
import { ProductRepositoryImpl } from "../../infrastructure/repositories/product.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { LocalProductsController } from "./local-products.controller";

export class LocalProductsRoutes {
  static routes(): Router {
    const router = Router();

    const branchDatasource = new PrismaBranchDatasource();
    const productDatasource = new PrismaProductDatasource();

    const branchRepository = new BranchRepositoryImpl(branchDatasource);
    const productRepository = new ProductRepositoryImpl(productDatasource);

    const getProductsUseCase = new GetProductsUseCase(productRepository, branchRepository);
    const createLocalTempProductUseCase = new CreateLocalTempProductUseCase(
      productRepository,
      branchRepository
    );
    const createLocalProductsFromItemsUseCase = new CreateLocalProductsFromItemsUseCase(
      productRepository,
      branchRepository
    );
    const updateLocalTempProductUseCase = new UpdateLocalTempProductUseCase(productRepository);
    const deleteLocalTempProductUseCase = new DeleteLocalTempProductUseCase(productRepository);

    const controller = new LocalProductsController(
      getProductsUseCase,
      createLocalTempProductUseCase,
      createLocalProductsFromItemsUseCase,
      updateLocalTempProductUseCase,
      deleteLocalTempProductUseCase
    );

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.list);
    router.post("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.create);
    router.patch(
      "/:id",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.update
    );
    router.delete(
      "/:id",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.remove
    );
    router.post(
      "/batch-from-items",
      requireAuth,
      requireRoles("ADMIN", "MANAGER", "SELLER"),
      controller.createFromItems
    );

    return router;
  }
}
