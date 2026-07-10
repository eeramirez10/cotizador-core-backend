import { Request, Response } from "express";
import { AnalyticsQueryRequestDto } from "../../domain/dtos/request/analytics-query-request.dto";
import { GetBranchAnalyticsUseCase } from "../../domain/use-cases/get-branch-analytics.use-case";
import { GetUserAnalyticsUseCase } from "../../domain/use-cases/get-user-analytics.use-case";

export class AnalyticsController {
  constructor(
    private readonly getBranchAnalyticsUseCase: GetBranchAnalyticsUseCase,
    private readonly getUserAnalyticsUseCase: GetUserAnalyticsUseCase
  ) {}

  branch = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, dto] = AnalyticsQueryRequestDto.create(req.query);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.getBranchAnalyticsUseCase.execute(dto!, req.user);
      res.status(200).json(result);
    } catch (caught) {
      this.handleError(res, caught, "Unexpected error while loading branch analytics.");
    }
  };

  user = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, dto] = AnalyticsQueryRequestDto.create(req.query);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.getUserAnalyticsUseCase.execute(dto!, req.user);
      res.status(200).json(result);
    } catch (caught) {
      this.handleError(res, caught, "Unexpected error while loading user analytics.");
    }
  };

  private handleError(res: Response, error: unknown, fallback: string): void {
    const message = error instanceof Error ? error.message : fallback;
    if (message.includes("not found")) return void res.status(404).json({ error: message });
    if (message.includes("not available")) return void res.status(403).json({ error: message });
    res.status(400).json({ error: message });
  }
}
