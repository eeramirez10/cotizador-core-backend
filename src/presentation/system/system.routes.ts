import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireRoles } from "../middlewares/rbac.middleware";
import { ManageSystemSettingsUseCase } from "../../domain/use-cases/manage-system-settings.use-case";
import { PrismaSystemSettingRepository } from "../../infrastructure/repositories/prisma-system-setting.repository";
import { runtimeSystemSettings } from "../../infrastructure/config/runtime-system-settings";
import { SystemController } from "./system.controller";

export class SystemRoutes {
  static routes(): Router {
    const router = Router();
    const controller = new SystemController(
      new ManageSystemSettingsUseCase(new PrismaSystemSettingRepository(), runtimeSystemSettings),
      runtimeSystemSettings,
    );

    router.get("/capabilities", requireAuth, controller.capabilities);
    router.get("/settings", requireAuth, requireRoles("ADMIN"), controller.listSettings);
    router.patch("/settings", requireAuth, requireRoles("ADMIN"), controller.updateSettings);
    router.post("/settings/reset", requireAuth, requireRoles("ADMIN"), controller.resetSettings);

    return router;
  }
}
