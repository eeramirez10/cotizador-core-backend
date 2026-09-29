import { Router } from "express";
import { ManagerReportSubscriptionsUseCase } from "../../domain/use-cases/manager-report-subscriptions.use-case";
import { PrismaManagerReportSubscriptionRepository } from "../../infrastructure/repositories/prisma-manager-report-subscription.repository";
import { createManagerReportSender } from "../../infrastructure/factories/manager-report-sender.factory";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { ReportSubscriptionsController } from "./report-subscriptions.controller";

export class ReportSubscriptionsRoutes {
  static routes(): Router {
    const router = Router();
    const repository = new PrismaManagerReportSubscriptionRepository();
    const controller = new ReportSubscriptionsController(
      new ManagerReportSubscriptionsUseCase(repository),
      createManagerReportSender(repository),
    );
    const access = [requireAuth, requireRoles("ADMIN")] as const;

    router.get("/", ...access, controller.list);
    router.post("/", ...access, controller.create);
    router.patch("/:id", ...access, controller.update);
    router.patch("/:id/status", ...access, controller.setActive);
    router.post("/:id/send-now", ...access, controller.sendNow);

    return router;
  }
}
