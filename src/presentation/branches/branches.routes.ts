import { Router } from "express";
import { GetBranchesUseCase } from "../../domain/use-cases/get-branches.use-case";
import { PrismaBranchDatasource } from "../../infrastructure/datasources/prisma-branch.datasource";
import { BranchRepositoryImpl } from "../../infrastructure/repositories/branch.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { BranchesController } from "./branches.controller";

export class BranchesRoutes {
  static routes(): Router {
    const router = Router();

    const branchDatasource = new PrismaBranchDatasource();
    const branchRepository = new BranchRepositoryImpl(branchDatasource);
    const getBranchesUseCase = new GetBranchesUseCase(branchRepository);
    const controller = new BranchesController(getBranchesUseCase);

    router.get("/", requireAuth, controller.list);

    return router;
  }
}
