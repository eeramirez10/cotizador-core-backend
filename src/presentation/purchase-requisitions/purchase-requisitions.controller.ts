import type { Request, Response } from "express";
import {
  AssignPurchaseRequisitionRequestDto,
  CreatePurchaseSupplierOfferRequestDto,
  GetPurchaseRequisitionsQueryDto,
  LinkPurchaseRequisitionItemToErpRequestDto,
  SaveSupplierRequestDto,
  UpdatePurchaseRequisitionItemRequestDto,
} from "../../domain/dtos/request/purchase-requisition-request.dto";
import { PurchaseRequisitionUseCase } from "../../domain/use-cases/purchase-requisition.use-case";

export class PurchaseRequisitionsController {
  constructor(private readonly useCase: PurchaseRequisitionUseCase) {}

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, dto] = GetPurchaseRequisitionsQueryDto.create(req.query);
    if (error) return void res.status(400).json({ error });
    try {
      res.status(200).json(await this.useCase.list(dto!, req.user));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while listing purchase requisitions.");
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.param(req.params.id);
    if (!id) return void res.status(400).json({ error: "Purchase requisition id is required." });
    try {
      res.status(200).json((await this.useCase.get(id, req.user)).toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while getting purchase requisition.");
    }
  };

  getByQuoteId = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const quoteId = this.param(req.params.quoteId);
    if (!quoteId) return void res.status(400).json({ error: "Quote id is required." });
    try {
      const result = await this.useCase.getByQuoteId(quoteId, req.user);
      if (!result) return void res.status(404).json({ error: "Purchase requisition not found." });
      res.status(200).json(result.toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while getting purchase requisition.");
    }
  };

  createFromQuote = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const quoteId = this.param(req.params.quoteId);
    if (!quoteId) return void res.status(400).json({ error: "Quote id is required." });
    try {
      const result = await this.useCase.createFromApprovedQuote(quoteId, req.user);
      if (!result) {
        return void res.status(200).json({
          requisition: null,
          message: "Quote does not contain items that require purchasing.",
        });
      }
      res.status(201).json(result.toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while creating purchase requisition.");
    }
  };

  updateItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.param(req.params.id);
    const itemId = this.param(req.params.itemId);
    if (!id || !itemId) return void res.status(400).json({ error: "Requisition and item ids are required." });
    const [error, dto] = UpdatePurchaseRequisitionItemRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      res.status(200).json((await this.useCase.updateItem(id, itemId, dto!, req.user)).toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while updating purchase requisition item.");
    }
  };

  linkItemToErp = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.param(req.params.id);
    const itemId = this.param(req.params.itemId);
    if (!id || !itemId) return void res.status(400).json({ error: "Requisition and item ids are required." });
    const [error, dto] = LinkPurchaseRequisitionItemToErpRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      res.status(200).json((await this.useCase.linkItemToErp(id, itemId, dto!, req.user)).toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while linking ERP product.");
    }
  };

  submit = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.param(req.params.id);
    if (!id) return void res.status(400).json({ error: "Purchase requisition id is required." });
    try {
      res.status(200).json((await this.useCase.submit(id, req.user)).toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while submitting purchase requisition.");
    }
  };

  assign = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.param(req.params.id);
    if (!id) return void res.status(400).json({ error: "Purchase requisition id is required." });
    const [error, dto] = AssignPurchaseRequisitionRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      res.status(200).json((await this.useCase.assign(id, dto!, req.user)).toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while assigning purchase requisition.");
    }
  };

  createOffer = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.param(req.params.id);
    const itemId = this.param(req.params.itemId);
    if (!id || !itemId) return void res.status(400).json({ error: "Requisition and item ids are required." });
    const [error, dto] = CreatePurchaseSupplierOfferRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      res.status(201).json((await this.useCase.createOffer(id, itemId, dto!, req.user)).toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while saving supplier offer.");
    }
  };

  selectOffer = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.param(req.params.id);
    const itemId = this.param(req.params.itemId);
    const offerId = this.param(req.params.offerId);
    if (!id || !itemId || !offerId) {
      return void res.status(400).json({ error: "Requisition, item and offer ids are required." });
    }
    try {
      res.status(200).json((await this.useCase.selectOffer(id, itemId, offerId, req.user)).toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while selecting supplier offer.");
    }
  };

  approveCostVariance = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.param(req.params.id);
    if (!id) return void res.status(400).json({ error: "Purchase requisition id is required." });
    try {
      res.status(200).json((await this.useCase.approveCostVariance(id, req.user)).toJSON());
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while approving purchase cost variance.");
    }
  };

  listSuppliers = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const search = typeof req.query.search === "string" ? req.query.search.trim() || undefined : undefined;
      const includeInactive = req.query.includeInactive === "true";
      res.status(200).json(await this.useCase.listSuppliers(search, includeInactive));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while listing suppliers.");
    }
  };

  createSupplier = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, dto] = SaveSupplierRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      res.status(201).json(await this.useCase.createSupplier(dto!, req.user));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while creating supplier.");
    }
  };

  updateSupplier = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const supplierId = this.param(req.params.supplierId);
    if (!supplierId) return void res.status(400).json({ error: "Supplier id is required." });
    const [error, dto] = SaveSupplierRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      res.status(200).json(await this.useCase.updateSupplier(supplierId, dto!, req.user));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while updating supplier.");
    }
  };

  private param(value: string | string[] | undefined): string | null {
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? null : null;
  }

  private handleError(res: Response, cause: unknown, fallback: string): void {
    const message = cause instanceof Error ? cause.message : fallback;
    if (message.includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }
    const conflict = message.includes("already exists") || message.includes("already has");
    if (conflict) {
      res.status(409).json({ error: message });
      return;
    }
    const isBusinessError =
      message.startsWith("Only ") ||
      message.startsWith("Quote must") ||
      message.startsWith("Purchase requisition") ||
      message.startsWith("All requisition") ||
      message.startsWith("Selected supplier") ||
      message.startsWith("Supplier origin") ||
      message.startsWith("Cannot ");
    res.status(isBusinessError ? 400 : 500).json({ error: message || fallback });
  }
}
