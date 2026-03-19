import { Router } from "express";
import { CreateBranchUseCase } from "../../domain/use-cases/create-branch.use-case";
import { DeactivateBranchUseCase } from "../../domain/use-cases/deactivate-branch.use-case";
import { GetBranchesUseCase } from "../../domain/use-cases/get-branches.use-case";
import { UpdateBranchUseCase } from "../../domain/use-cases/update-branch.use-case";
import { PrismaBranchDatasource } from "../../infrastructure/datasources/prisma-branch.datasource";
import { BranchRepositoryImpl } from "../../infrastructure/repositories/branch.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { BranchesController } from "./branches.controller";

export class BranchesRoutes {
  static routes(): Router {
    const router = Router();

    const branchDatasource = new PrismaBranchDatasource();
    const branchRepository = new BranchRepositoryImpl(branchDatasource);
    const getBranchesUseCase = new GetBranchesUseCase(branchRepository);
    const createBranchUseCase = new CreateBranchUseCase(branchRepository);
    const updateBranchUseCase = new UpdateBranchUseCase(branchRepository);
    const deactivateBranchUseCase = new DeactivateBranchUseCase(branchRepository);
    const controller = new BranchesController(
      getBranchesUseCase,
      createBranchUseCase,
      updateBranchUseCase,
      deactivateBranchUseCase
    );

    router.get("/", requireAuth, controller.list);
    router.post("/", requireAuth, requireRoles("ADMIN"), controller.create);
    router.patch("/:id", requireAuth, requireRoles("ADMIN"), controller.update);
    router.patch("/:id/deactivate", requireAuth, requireRoles("ADMIN"), controller.deactivate);

    return router;
  }
}
