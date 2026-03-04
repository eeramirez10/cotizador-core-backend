import { Router } from "express";
import { AuthRoutes } from "./auth/auth.routes";
import { BranchesRoutes } from "./branches/branches.routes";
import { UsersRoutes } from "./users/users.routes";

export class AppRoutes {
  public static routes(): Router {
    const router = Router();

    router.get("/health", (_req, res) => {
      res.status(200).json({ ok: true, service: "cotizador-core-backend" });
    });

    router.use("/auth", AuthRoutes.routes());
    router.use("/branches", BranchesRoutes.routes());
    router.use("/users", UsersRoutes.routes());

    return router;
  }
}
