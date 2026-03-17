import { Request, Response } from "express";
import { CreateUserRequestDto } from "../../domain/dtos/request/create-user-request.dto";
import { GetUsersQueryRequestDto } from "../../domain/dtos/request/get-users-query-request.dto";
import { UpdateUserRequestDto } from "../../domain/dtos/request/update-user-request.dto";
import { CreateUserUseCase } from "../../domain/use-cases/create-user.use-case";
import { DeactivateUserUseCase } from "../../domain/use-cases/deactivate-user.use-case";
import { GetUsersUseCase } from "../../domain/use-cases/get-users.use-case";
import { UpdateUserUseCase } from "../../domain/use-cases/update-user.use-case";

export class UsersController {
  constructor(
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase
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
      this.handleError(res, err, "Unexpected error while listing users.");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [bodyError, bodyDto] = CreateUserRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.createUserUseCase.execute(bodyDto!, {
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(201).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while creating user.");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const userId = String(req.params.id ?? "").trim();
    if (!userId) {
      res.status(400).json({ error: "User id is required." });
      return;
    }

    const [bodyError, bodyDto] = UpdateUserRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.updateUserUseCase.execute(userId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while updating user.");
    }
  };

  deactivate = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const userId = String(req.params.id ?? "").trim();
    if (!userId) {
      res.status(400).json({ error: "User id is required." });
      return;
    }

    try {
      await this.deactivateUserUseCase.execute(userId, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(204).send();
    } catch (err) {
      this.handleError(res, err, "Unexpected error while deactivating user.");
    }
  };

  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    const message = error instanceof Error ? error.message : fallbackMessage;

    if (message === "Branch not found." || message === "User not found.") {
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

    if (
      message === "MANAGER cannot assign ADMIN role." ||
      message === "MANAGER cannot update ADMIN users." ||
      message === "MANAGER can only assign users from own branch."
    ) {
      res.status(403).json({ error: message });
      return;
    }

    if (message === "You cannot deactivate your own user.") {
      res.status(400).json({ error: message });
      return;
    }

    res.status(400).json({ error: message });
  }
}
