import { Request, Response } from "express";
import { AiPlatformGateway, AiPlatformResponse } from "../../domain/contracts/ai-platform.gateway";
import { ErpWarehouseAccessUseCase } from "../../domain/use-cases/erp-warehouse-access.use-case";

export class AiPlatformController {
  constructor(
    private readonly gateway: AiPlatformGateway,
    private readonly warehouseAccess: ErpWarehouseAccessUseCase,
  ) {}

  public createDocumentJob = (req: Request, res: Response) => this.forwardFile(req, res, "/api/extract/jobs");
  public createQuotedExcelJob = (req: Request, res: Response) => this.forwardFile(req, res, "/api/extract/jobs/quoted-excel");
  public createSupplierQuoteJob = (req: Request, res: Response) => this.forwardFile(req, res, "/api/extract/jobs/supplier-quote");
  public createTextJob = (req: Request, res: Response) => this.forwardJson(req, res, "/api/extract/jobs/text");
  public normalizeMissingProducts = (req: Request, res: Response) => this.forwardJson(req, res, "/api/products/normalize-missing");
  public suggestTechnicalData = (req: Request, res: Response) => this.forwardJson(req, res, "/api/procurement/technical-data/suggest");
  public suggestTechnicalDataBatch = (req: Request, res: Response) => this.forwardJson(req, res, "/api/procurement/technical-data/suggest-batch");
  public suggestCatalogCode = (req: Request, res: Response) => this.forwardJson(req, res, "/api/quote-catalogs/suggest-code");
  public extractPartyData = (req: Request, res: Response) => this.forwardJson(req, res, "/api/parties/extract");
  public searchSimilar = (req: Request, res: Response) => this.forwardWarehouseAwareSearch(req, res, "/api/ai/products/similar");
  public searchSimilarV2 = (req: Request, res: Response) => this.forwardWarehouseAwareSearch(req, res, "/api/ai/products/similar-v2");
  public searchSimilarV2Semantic = (req: Request, res: Response) => this.forwardWarehouseAwareSearch(req, res, "/api/ai/products/similar-v2/semantic");

  public jobStatus = async (req: Request, res: Response): Promise<void> => {
    await this.forwardGet(res, `/api/extract/jobs/${encodeURIComponent(String(req.params.id))}/status`);
  };

  public jobResult = async (req: Request, res: Response): Promise<void> => {
    await this.forwardGet(res, `/api/extract/jobs/${encodeURIComponent(String(req.params.id))}/result`);
  };

  private forwardJson = async (req: Request, res: Response, path: string): Promise<void> => {
    try {
      const result = await this.gateway.requestJson(
        path,
        "POST",
        req.body,
        req.header("idempotency-key") ?? req.header("x-idempotency-key") ?? undefined,
      );
      this.respond(res, result);
    } catch (error) {
      this.unavailable(res, error);
    }
  };

  private forwardWarehouseAwareSearch = async (req: Request, res: Response, path: string): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    try {
      const access = await this.warehouseAccess.getUserAccess(req.user.id);
      const authorizedWarehouseCodes = access.effectiveWarehouses.map((warehouse) => warehouse.code);
      if (authorizedWarehouseCodes.length === 0) {
        res.status(400).json({ error: "The user has no ERP warehouses assigned." });
        return;
      }
      const warehouseCodes = (await this.warehouseAccess.listWarehouses(false))
        .map((warehouse) => warehouse.code);
      const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body as Record<string, unknown>
        : {};
      const result = await this.gateway.requestJson(path, "POST", {
        ...body,
        warehouseCodes,
        authorizedWarehouseCodes,
      });
      this.respond(res, result);
    } catch (error) {
      this.unavailable(res, error);
    }
  };

  private forwardFile = async (req: Request, res: Response, path: string): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "Debes enviar un archivo en el campo 'file'." });
      return;
    }
    try {
      const result = await this.gateway.requestFile(path, {
        content: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
      this.respond(res, result);
    } catch (error) {
      this.unavailable(res, error);
    }
  };

  private async forwardGet(res: Response, path: string): Promise<void> {
    try {
      this.respond(res, await this.gateway.requestJson(path, "GET"));
    } catch (error) {
      this.unavailable(res, error);
    }
  }

  private respond(res: Response, result: AiPlatformResponse): void {
    res.status(result.status).json(result.body);
  }

  private unavailable(res: Response, error: unknown): void {
    res.status(502).json({
      error: error instanceof Error ? error.message : "AI platform is unavailable.",
    });
  }
}
