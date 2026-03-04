import { Request, Response } from "express";
import { GetBranchesUseCase } from "../../domain/use-cases/get-branches.use-case";

export class BranchesController {
  constructor(private readonly getBranchesUseCase: GetBranchesUseCase) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.getBranchesUseCase.execute();
      res.status(200).json(result.map((item) => item.toJSON()));
    } catch {
      res.status(500).json({ error: "Unexpected error while listing branches." });
    }
  };
}
