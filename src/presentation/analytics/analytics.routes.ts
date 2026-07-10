import { Router } from "express";
import { GetBranchAnalyticsUseCase } from "../../domain/use-cases/get-branch-analytics.use-case";
import { GetUserAnalyticsUseCase } from "../../domain/use-cases/get-user-analytics.use-case";
import { PrismaAnalyticsDatasource } from "../../infrastructure/datasources/prisma-analytics.datasource";
import { PrismaBranchDatasource } from "../../infrastructure/datasources/prisma-branch.datasource";
import { PrismaUserDatasource } from "../../infrastructure/datasources/prisma-user.datasource";
import { AnalyticsRepositoryImpl } from "../../infrastructure/repositories/analytics.repository-impl";
import { BranchRepositoryImpl } from "../../infrastructure/repositories/branch.repository-impl";
import { UserRepositoryImpl } from "../../infrastructure/repositories/user.repository-impl";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { AnalyticsController } from "./analytics.controller";

export class AnalyticsRoutes {
  static routes(): Router {
    const router = Router();
    const analyticsRepository = new AnalyticsRepositoryImpl(new PrismaAnalyticsDatasource());
    const branchRepository = new BranchRepositoryImpl(new PrismaBranchDatasource());
    const userRepository = new UserRepositoryImpl(new PrismaUserDatasource());
    const controller = new AnalyticsController(
      new GetBranchAnalyticsUseCase(analyticsRepository, branchRepository),
      new GetUserAnalyticsUseCase(analyticsRepository, userRepository)
    );

    router.get("/branch", requireAuth, requireRoles("ADMIN", "MANAGER"), controller.branch);
    router.get("/user", requireAuth, requireRoles("ADMIN", "MANAGER", "SELLER"), controller.user);
    return router;
  }
}
