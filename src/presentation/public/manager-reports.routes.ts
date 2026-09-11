import { Router } from "express";
import { ManagerReportsController } from "./manager-reports.controller";

export class ManagerReportsRoutes {
  static routes(): Router {
    const router = Router();
    const controller = new ManagerReportsController();

    router.get("/sample.pdf", controller.sample);

    return router;
  }
}
