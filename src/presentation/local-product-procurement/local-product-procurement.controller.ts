import { Request, Response } from "express";
import { ChangeProcurementStatusRequestDto } from "../../domain/dtos/request/change-procurement-status-request.dto";
import { GetLocalProductProcurementQueryDto } from "../../domain/dtos/request/get-local-product-procurement-query.dto";
import { UpsertProcurementOfferRequestDto } from "../../domain/dtos/request/upsert-procurement-offer-request.dto";
import { LocalProductProcurementUseCase } from "../../domain/use-cases/local-product-procurement.use-case";

export class LocalProductProcurementController {
  constructor(private readonly useCase: LocalProductProcurementUseCase) {}

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, dto] = GetLocalProductProcurementQueryDto.create(req.query);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.useCase.list(dto!, req.user);
      res.status(200).json(result.toJSON());
    } catch (caught) {
      this.handleError(res, caught, "Unexpected error while listing procurement products.");
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const result = await this.useCase.get(this.productId(req), req.user);
      res.status(200).json(result.toJSON());
    } catch (caught) {
      this.handleError(res, caught, "Unexpected error while loading procurement product.");
    }
  };

  createOffer = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, dto] = UpsertProcurementOfferRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.useCase.createOffer(this.productId(req), dto!, req.user);
      res.status(201).json(result.toJSON());
    } catch (caught) {
      this.handleError(res, caught, "Unexpected error while creating supplier offer.");
    }
  };

  updateOffer = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, dto] = UpsertProcurementOfferRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.useCase.updateOffer(
        this.productId(req),
        this.offerId(req),
        dto!,
        req.user,
      );
      res.status(200).json(result.toJSON());
    } catch (caught) {
      this.handleError(res, caught, "Unexpected error while updating supplier offer.");
    }
  };

  deactivateOffer = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      await this.useCase.deactivateOffer(this.offerId(req), req.user);
      res.status(204).send();
    } catch (caught) {
      this.handleError(res, caught, "Unexpected error while removing supplier offer.");
    }
  };

  selectOffer = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const result = await this.useCase.selectOffer(
        this.productId(req),
        this.offerId(req),
        req.user,
      );
      res.status(200).json(result.toJSON());
    } catch (caught) {
      this.handleError(res, caught, "Unexpected error while selecting supplier offer.");
    }
  };

  changeStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, dto] = ChangeProcurementStatusRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.useCase.changeStatus(this.productId(req), dto!, req.user);
      res.status(200).json(result.toJSON());
    } catch (caught) {
      this.handleError(res, caught, "Unexpected error while changing procurement status.");
    }
  };

  private productId(req: Request): string {
    return String(req.params.productId ?? "").trim();
  }

  private offerId(req: Request): string {
    return String(req.params.offerId ?? "").trim();
  }

  private handleError(res: Response, error: unknown, fallback: string): void {
    const message = error instanceof Error ? error.message : fallback;
    if (message.toLowerCase().includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }
    if (
      message.toLowerCase().includes("invalid")
      || message.toLowerCase().includes("required")
      || message.toLowerCase().includes("cannot")
      || message.toLowerCase().includes("select")
    ) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: fallback });
  }
}
