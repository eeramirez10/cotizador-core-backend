import { Router } from "express";
import { CreateCustomerUseCase } from "../../domain/use-cases/create-customer.use-case";
import { CreateCustomerContactUseCase } from "../../domain/use-cases/create-customer-contact.use-case";
import { DeleteCustomerUseCase } from "../../domain/use-cases/delete-customer.use-case";
import { DeleteCustomerContactUseCase } from "../../domain/use-cases/delete-customer-contact.use-case";
import { GetCustomerByIdUseCase } from "../../domain/use-cases/get-customer-by-id.use-case";
import { GetCustomerContactsUseCase } from "../../domain/use-cases/get-customer-contacts.use-case";
import { GetCustomersUseCase } from "../../domain/use-cases/get-customers.use-case";
import { UpdateCustomerUseCase } from "../../domain/use-cases/update-customer.use-case";
import { UpdateCustomerContactUseCase } from "../../domain/use-cases/update-customer-contact.use-case";
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
    const getCustomerContactsUseCase = new GetCustomerContactsUseCase(repository);
    const createCustomerContactUseCase = new CreateCustomerContactUseCase(repository);
    const updateCustomerContactUseCase = new UpdateCustomerContactUseCase(repository);
    const deleteCustomerContactUseCase = new DeleteCustomerContactUseCase(repository);

    const controller = new CustomersController(
      getCustomersUseCase,
      getCustomerByIdUseCase,
      createCustomerUseCase,
      updateCustomerUseCase,
      deleteCustomerUseCase,
      getCustomerContactsUseCase,
      createCustomerContactUseCase,
      updateCustomerContactUseCase,
      deleteCustomerContactUseCase
    );

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.list);
    router.get("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.getById);
    router.post("/", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.create);
    router.patch("/:id", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.update);
    router.get("/:id/contacts", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.listContacts);
    router.post("/:id/contacts", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.createContact);
    router.patch("/:id/contacts/:contactId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.updateContact);
    router.delete("/:id/contacts/:contactId", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.removeContact);
    router.delete("/:id", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.remove);

    return router;
  }
}
