import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { SystemController } from "./system.controller";

export class SystemRoutes {
  static routes(): Router {
    const router = Router();
    const controller = new SystemController();

    router.get("/capabilities", requireAuth, controller.capabilities);

    return router;
  }
}
