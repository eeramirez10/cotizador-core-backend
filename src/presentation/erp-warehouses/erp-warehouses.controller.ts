import { Request, Response } from "express";
import { ReplaceWarehouseAccessRequestDto } from "../../domain/dtos/request/replace-warehouse-access-request.dto";
import { SearchErpProductsRequestDto } from "../../domain/dtos/request/search-erp-products-request.dto";
import { UpsertErpWarehouseRequestDto } from "../../domain/dtos/request/upsert-erp-warehouse-request.dto";
import { ErpWarehouseAccessUseCase } from "../../domain/use-cases/erp-warehouse-access.use-case";

export class ErpWarehousesController {
  constructor(private readonly useCase: ErpWarehouseAccessUseCase) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const includeInactive = String(req.query.includeInactive ?? "").toLowerCase() === "true";
    try {
      res.status(200).json(await this.useCase.listWarehouses(includeInactive));
    } catch (error) {
      this.handleError(res, error, "Unexpected error while listing ERP warehouses.");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const [error, dto] = UpsertErpWarehouseRequestDto.create(req.body, { requireCode: true });
    if (error) return void res.status(400).json({ error });
    try {
      res.status(201).json(await this.useCase.createWarehouse(dto!));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while creating ERP warehouse.");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id ?? "").trim();
    if (!id) return void res.status(400).json({ error: "ERP warehouse id is required." });
    const [error, dto] = UpsertErpWarehouseRequestDto.create(req.body, { requireCode: false });
    if (error) return void res.status(400).json({ error });
    try {
      res.status(200).json(await this.useCase.updateWarehouse(id, dto!));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while updating ERP warehouse.");
    }
  };

  getBranchAccess = async (req: Request, res: Response): Promise<void> => {
    const branchId = String(req.params.branchId ?? "").trim();
    if (!branchId) return void res.status(400).json({ error: "Branch id is required." });
    try {
      res.status(200).json(await this.useCase.getBranchAccess(branchId));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while getting branch ERP warehouses.");
    }
  };

  replaceBranchAccess = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const branchId = String(req.params.branchId ?? "").trim();
    if (!branchId) return void res.status(400).json({ error: "Branch id is required." });
    const [error, dto] = ReplaceWarehouseAccessRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      res.status(200).json(await this.useCase.replaceBranchAccess(branchId, dto!.warehouseCodes, req.user.id));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while assigning branch ERP warehouses.");
    }
  };

  getUserAccess = async (req: Request, res: Response): Promise<void> => {
    const userId = String(req.params.userId ?? "").trim();
    if (!userId) return void res.status(400).json({ error: "User id is required." });
    try {
      res.status(200).json(await this.useCase.getUserAccess(userId));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while getting user ERP warehouses.");
    }
  };

  replaceUserAccess = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const userId = String(req.params.userId ?? "").trim();
    if (!userId) return void res.status(400).json({ error: "User id is required." });
    const [error, dto] = ReplaceWarehouseAccessRequestDto.create(req.body, true);
    if (error) return void res.status(400).json({ error });
    try {
      res.status(200).json(await this.useCase.replaceUserAccess(
        userId,
        dto!.accessMode!,
        dto!.warehouseCodes,
        req.user.id,
      ));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while assigning user ERP warehouses.");
    }
  };

  getMyEffectiveAccess = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      res.status(200).json(await this.useCase.getUserAccess(req.user.id));
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while resolving ERP warehouses.");
    }
  };

  searchProducts = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, dto] = SearchErpProductsRequestDto.create(req.query.query ?? req.query.q);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.useCase.searchProducts(req.user.id, dto!.term);
      res.status(200).json({
        query: dto!.term,
        warehouseCodes: result.warehouseCodes,
        authorizedWarehouseCodes: result.authorizedWarehouseCodes,
        itemsCount: result.items.length,
        items: result.items,
      });
    } catch (cause) {
      this.handleError(res, cause, "Unexpected error while searching ERP products.");
    }
  };

  private handleError(res: Response, error: unknown, fallback: string): void {
    const message = error instanceof Error ? error.message : fallback;
    if (message === "Branch not found." || message === "User not found." || message === "ERP warehouse not found.") {
      res.status(404).json({ error: message });
      return;
    }
    if (message === "ERP warehouse code already exists.") {
      res.status(409).json({ error: message });
      return;
    }
    if (
      message.startsWith("ERP warehouses not found or inactive:") ||
      message.includes("requires at least one") ||
      message.includes("cannot contain") ||
      message.includes("no ERP warehouses assigned") ||
      message.includes("Cannot configure") ||
      message.includes("Cannot deactivate") ||
      message.includes("code cannot be changed") ||
      message.includes("can only be assigned") ||
      message.includes("Only sellers")
    ) {
      res.status(400).json({ error: message });
      return;
    }
    if (message.startsWith("ERP product search failed") || message.includes("ERP product search returned")) {
      res.status(502).json({ error: message });
      return;
    }
    console.error("erp_warehouse_access_failed", error);
    res.status(500).json({ error: fallback });
  }
}
