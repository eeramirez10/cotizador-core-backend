import { Router } from "express";
import { CreateUserUseCase } from "../../domain/use-cases/create-user.use-case";
import { DeactivateUserUseCase } from "../../domain/use-cases/deactivate-user.use-case";
import { GetUsersUseCase } from "../../domain/use-cases/get-users.use-case";
import { UpdateUserUseCase } from "../../domain/use-cases/update-user.use-case";
import { PrismaBranchDatasource } from "../../infrastructure/datasources/prisma-branch.datasource";
import { PrismaUserDatasource } from "../../infrastructure/datasources/prisma-user.datasource";
import { BranchRepositoryImpl } from "../../infrastructure/repositories/branch.repository-impl";
import { UserRepositoryImpl } from "../../infrastructure/repositories/user.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { UsersController } from "./users.controller";

export class UsersRoutes {
  static routes(): Router {
    const router = Router();

    const branchDatasource = new PrismaBranchDatasource();
    const userDatasource = new PrismaUserDatasource();

    const branchRepository = new BranchRepositoryImpl(branchDatasource);
    const userRepository = new UserRepositoryImpl(userDatasource);

    const getUsersUseCase = new GetUsersUseCase(userRepository, branchRepository);
    const createUserUseCase = new CreateUserUseCase(userRepository, branchRepository);
    const updateUserUseCase = new UpdateUserUseCase(userRepository, branchRepository);
    const deactivateUserUseCase = new DeactivateUserUseCase(userRepository);

    const controller = new UsersController(
      getUsersUseCase,
      createUserUseCase,
      updateUserUseCase,
      deactivateUserUseCase
    );

    router.get("/", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.list);
    router.post("/", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.create);
    router.patch("/:id", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.update);
    router.patch("/:id/deactivate", requireAuth, requireRoles("ADMIN"), controller.deactivate);

    return router;
  }
}
