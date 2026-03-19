import { Request, Response } from "express";
import { CreateBranchRequestDto } from "../../domain/dtos/request/create-branch-request.dto";
import { UpdateBranchRequestDto } from "../../domain/dtos/request/update-branch-request.dto";
import { CreateBranchUseCase } from "../../domain/use-cases/create-branch.use-case";
import { DeactivateBranchUseCase } from "../../domain/use-cases/deactivate-branch.use-case";
import { GetBranchesUseCase } from "../../domain/use-cases/get-branches.use-case";
import { UpdateBranchUseCase } from "../../domain/use-cases/update-branch.use-case";

export class BranchesController {
  constructor(
    private readonly getBranchesUseCase: GetBranchesUseCase,
    private readonly createBranchUseCase: CreateBranchUseCase,
    private readonly updateBranchUseCase: UpdateBranchUseCase,
    private readonly deactivateBranchUseCase: DeactivateBranchUseCase
  ) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.getBranchesUseCase.execute();
      res.status(200).json(result.map((item) => item.toJSON()));
    } catch (err) {
      this.handleError(res, err, "Unexpected error while listing branches.");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const [bodyError, bodyDto] = CreateBranchRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.createBranchUseCase.execute(bodyDto!);
      res.status(201).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while creating branch.");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const branchId = String(req.params.id ?? "").trim();
    if (!branchId) {
      res.status(400).json({ error: "Branch id is required." });
      return;
    }

    const [bodyError, bodyDto] = UpdateBranchRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.updateBranchUseCase.execute(branchId, bodyDto!);
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while updating branch.");
    }
  };

  deactivate = async (req: Request, res: Response): Promise<void> => {
    const branchId = String(req.params.id ?? "").trim();
    if (!branchId) {
      res.status(400).json({ error: "Branch id is required." });
      return;
    }

    try {
      await this.deactivateBranchUseCase.execute(branchId);
      res.status(204).send();
    } catch (err) {
      this.handleError(res, err, "Unexpected error while deactivating branch.");
    }
  };

  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    const message = error instanceof Error ? error.message : fallbackMessage;

    if (message === "Branch not found.") {
      res.status(404).json({ error: message });
      return;
    }

    if (message === "Branch code already exists.") {
      res.status(409).json({ error: message });
      return;
    }

    if (message === "Cannot deactivate branch with active users.") {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: fallbackMessage });
  }
}
