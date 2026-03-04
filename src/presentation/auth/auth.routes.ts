import { Router } from "express";
import { AuthController } from "./auth.controller";
import { PrismaAuthDatasource } from "../../infrastructure/datasources/prisma-auth.datasource";
import { AuthRepositoryImpl } from "../../infrastructure/repositories/auth.repository-impl";
import { LoginUseCase } from "../../domain/use-cases/login.use-case";
import { GetAuthUserUseCase } from "../../domain/use-cases/get-auth-user.use-case";
import { requireAuth } from "../middlewares/auth.middleware";


export class AuthRoutes {

  static routes(): Router {

    const router = Router();

    const datasource = new PrismaAuthDatasource();
    const repository = new AuthRepositoryImpl(datasource);

    const loginUseCase = new LoginUseCase(repository);
    const getAuthUserUseCase = new GetAuthUserUseCase(repository);

    const controller = new AuthController(loginUseCase, getAuthUserUseCase)

    router.post("/login", controller.login);
    router.get("/me", requireAuth, controller.me);

    return router;
  }
}