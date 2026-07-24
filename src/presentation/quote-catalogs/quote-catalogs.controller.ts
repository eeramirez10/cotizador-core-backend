import { Request, Response } from "express";
import { QuoteCatalogType } from "../../infrastructure/database/generated/enums";
import { UpsertQuoteCatalogOptionRequestDto } from "../../domain/dtos/request/upsert-quote-catalog-option-request.dto";
import { QuoteCatalogOptionsUseCase } from "../../domain/use-cases/quote-catalog-options.use-case";

export class QuoteCatalogsController {
  constructor(private readonly useCase: QuoteCatalogOptionsUseCase) {}

  listAvailable = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const rawType = typeof req.query.type === "string" ? req.query.type.trim().toUpperCase() : "";
    if (rawType && !Object.values(QuoteCatalogType).includes(rawType as QuoteCatalogType)) {
      res.status(400).json({ error: "type is invalid." });
      return;
    }
    try {
      const result = await this.useCase.listAvailable({ role: req.user.role, branchId: req.user.branchId }, rawType as QuoteCatalogType || undefined);
      res.status(200).json(result.map((option) => option.toJSON()));
    } catch (error) {
      this.handleError(res, error, "Unexpected error while listing catalog options.");
    }
  };

  listManaged = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const result = await this.useCase.listManaged({ role: req.user.role, branchId: req.user.branchId });
      res.status(200).json(result.map((option) => option.toJSON()));
    } catch (error) {
      this.handleError(res, error, "Unexpected error while listing managed catalog options.");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [bodyError, dto] = UpsertQuoteCatalogOptionRequestDto.create(req.body, { allowBranchId: req.user.role === "ADMIN", allowCode: true });
    if (bodyError) return void res.status(400).json({ error: bodyError });
    try {
      const result = await this.useCase.create(dto!, { role: req.user.role, branchId: req.user.branchId });
      res.status(201).json(result.toJSON());
    } catch (error) {
      this.handleError(res, error, "Unexpected error while creating catalog option.");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = String(req.params.id ?? "").trim();
    if (!id) return void res.status(400).json({ error: "Catalog option id is required." });
    const [bodyError, dto] = UpsertQuoteCatalogOptionRequestDto.create(req.body, { allowCode: true });
    if (bodyError) return void res.status(400).json({ error: bodyError });
    try {
      const result = await this.useCase.update(id, dto!, { role: req.user.role, branchId: req.user.branchId });
      res.status(200).json(result.toJSON());
    } catch (error) {
      this.handleError(res, error, "Unexpected error while updating catalog option.");
    }
  };

  deactivate = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = String(req.params.id ?? "").trim();
    if (!id) return void res.status(400).json({ error: "Catalog option id is required." });
    try {
      await this.useCase.deactivate(id, { role: req.user.role, branchId: req.user.branchId });
      res.status(204).send();
    } catch (error) {
      this.handleError(res, error, "Unexpected error while deactivating catalog option.");
    }
  };

  private handleError(res: Response, error: unknown, fallback: string): void {
    const message = error instanceof Error ? error.message : fallback;
    if (["Catalog option not found.", "You can only manage catalog options from your branch.", "Catalog option type and code cannot be changed.", "Catalog option code already exists in this scope.", "PURCHASING can only manage procurement catalog options.", "Procurement catalog options are managed by ADMIN or PURCHASING."].includes(message)) {
      res.status(message === "Catalog option not found." ? 404 : message.includes("already exists") ? 409 : 403).json({ error: message });
      return;
    }
    res.status(500).json({ error: fallback });
  }
}
