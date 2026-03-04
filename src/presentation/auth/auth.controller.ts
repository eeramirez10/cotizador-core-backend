import { Response, Request } from "express";
import { LoginRequestDto } from "../../domain/dtos/request/login-request.dto";
import { GetAuthUserUseCase } from "../../domain/use-cases/get-auth-user.use-case";
import { LoginUseCase } from "../../domain/use-cases/login.use-case";

export class AuthController {
    constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getAuthUserUseCase: GetAuthUserUseCase
  ) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const [error, dto] = LoginRequestDto.create(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    try {
      const result = await this.loginUseCase.execute(dto!);
      
      res.status(200).json(result.toJSON());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      res.status(401).json({ error: message });
    }
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const user = await this.getAuthUserUseCase.execute(req.user.id);
      res.status(200).json(user.toJSON());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unauthorized";
      res.status(401).json({ error: message });
    }
  };
}