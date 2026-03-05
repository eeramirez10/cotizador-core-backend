import { Router } from "express";
import { CreateCustomerUseCase } from "../../domain/use-cases/create-customer.use-case";
import { DeleteCustomerUseCase } from "../../domain/use-cases/delete-customer.use-case";
import { GetCustomerByIdUseCase } from "../../domain/use-cases/get-customer-by-id.use-case";
import { GetCustomersUseCase } from "../../domain/use-cases/get-customers.use-case";
import { UpdateCustomerUseCase } from "../../domain/use-cases/update-customer.use-case";
import { PrismaCustomerDatasource } from "../../infrastructure/datasources/prisma-customer.datasource";
import { CustomerRepositoryImpl } from "../../infrastructure/repositories/customer.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { CustomersController } from "./customers.controller";

export class CustomersRoutes {
  static routes(): Router {
    const router = Router();

    const datasource = new PrismaCustomerDatasource();
    const repository = new CustomerRepositoryImpl(datasource);

    const getCustomersUseCase = new GetCustomersUseCase(repository);
    const getCustomerByIdUseCase = new GetCustomerByIdUseCase(repository);
    const createCustomerUseCase = new CreateCustomerUseCase(repository);
    const updateCustomerUseCase = new UpdateCustomerUseCase(repository);
    const deleteCustomerUseCase = new DeleteCustomerUseCase(repository);

    const controller = new CustomersController(
      getCustomersUseCase,
      getCustomerByIdUseCase,
      createCustomerUseCase,
      updateCustomerUseCase,
      deleteCustomerUseCase
    );

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.list);
    router.get("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.getById);
    router.post("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.create);
    router.patch("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.update);
    router.delete("/:id", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.remove);

    return router;
  }
}
