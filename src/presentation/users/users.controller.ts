import { Request, Response } from "express";
import { CreateUserRequestDto } from "../../domain/dtos/request/create-user-request.dto";
import { GetUsersQueryRequestDto } from "../../domain/dtos/request/get-users-query-request.dto";
import { CreateUserUseCase } from "../../domain/use-cases/create-user.use-case";
import { GetUsersUseCase } from "../../domain/use-cases/get-users.use-case";

export class UsersController {
  constructor(
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly createUserUseCase: CreateUserUseCase
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [queryError, queryDto] = GetUsersQueryRequestDto.create(req.query);
    if (queryError) {
      res.status(400).json({ error: queryError });
      return;
    }

    try {
      const result = await this.getUsersUseCase.execute(queryDto!, {
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(200).json(result.toJSON());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while listing users.";
      if (message === "Branch not found.") {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const [bodyError, bodyDto] = CreateUserRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.createUserUseCase.execute(bodyDto!);
      res.status(201).json(result.toJSON());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while creating user.";
      if (message === "Branch not found.") {
        res.status(404).json({ error: message });
        return;
      }

      if (
        message === "Email already exists." ||
        message === "Username already exists." ||
        message === "ERP user code already exists."
      ) {
        res.status(409).json({ error: message });
        return;
      }

      res.status(400).json({ error: message });
    }
  };
}
