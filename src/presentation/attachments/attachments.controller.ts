import type { Request, Response } from "express";
import type { FileAttachmentEntity } from "../../domain/entities/file-attachment.entity";
import { FileAttachmentsUseCase } from "../../domain/use-cases/file-attachments.use-case";

export class AttachmentsController {
  constructor(private readonly useCase: FileAttachmentsUseCase) {}

  uploadQuoteSource = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const clientDraftId = this.param(req.params.clientDraftId);
    if (!clientDraftId) return void res.status(400).json({ error: "clientDraftId is required." });
    if (!req.file) return void res.status(400).json({ error: "Attachment file is required." });
    try {
      const result = await this.useCase.uploadQuoteSource(clientDraftId, this.file(req.file), req.user);
      res.status(201).json(this.response(result));
    } catch (error) {
      this.handleError(res, error);
    }
  };

  uploadSellerQuote = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const clientDraftId = this.param(req.params.clientDraftId);
    if (!clientDraftId) return void res.status(400).json({ error: "clientDraftId is required." });
    if (!req.file) return void res.status(400).json({ error: "Attachment file is required." });
    try {
      const result = await this.useCase.uploadSellerQuote(
        clientDraftId,
        this.idList(req.body.clientItemIds),
        this.file(req.file),
        req.user,
      );
      res.status(201).json(this.response(result));
    } catch (error) {
      this.handleError(res, error);
    }
  };

  uploadPurchaseOffer = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const requisitionId = this.param(req.params.requisitionId);
    if (!requisitionId) return void res.status(400).json({ error: "requisitionId is required." });
    if (!req.file) return void res.status(400).json({ error: "Attachment file is required." });
    try {
      const result = await this.useCase.uploadPurchaseOffer(
        requisitionId,
        this.idList(req.body.purchaseOfferIds),
        this.file(req.file),
        req.user,
      );
      res.status(201).json(this.response(result));
    } catch (error) {
      this.handleError(res, error);
    }
  };

  listQuoteDraft = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const rows = await this.useCase.listQuoteDraft(this.param(req.params.clientDraftId), req.user);
      res.status(200).json(rows.map((row) => this.response(row)));
    } catch (error) {
      this.handleError(res, error);
    }
  };

  listQuote = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const rows = await this.useCase.listQuote(this.param(req.params.quoteId), req.user);
      res.status(200).json(rows.map((row) => this.response(row)));
    } catch (error) {
      this.handleError(res, error);
    }
  };

  listPurchaseRequisition = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const rows = await this.useCase.listPurchaseRequisition(this.param(req.params.requisitionId), req.user);
      res.status(200).json(rows.map((row) => this.response(row)));
    } catch (error) {
      this.handleError(res, error);
    }
  };

  download = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const file = await this.useCase.download(this.param(req.params.fileId), req.user);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Length", String(file.content.byteLength));
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
      res.status(200).send(Buffer.from(file.content));
    } catch (error) {
      this.handleError(res, error);
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      await this.useCase.delete(this.param(req.params.fileId), req.user);
      res.status(204).send();
    } catch (error) {
      this.handleError(res, error);
    }
  };

  private file(file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      mimeType: file.mimetype,
      content: file.buffer,
      sizeBytes: file.size,
    };
  }

  private idList(value: unknown): string[] {
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return value.split(",");
    }
  }

  private param(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0]?.trim() || "" : value?.trim() || "";
  }

  private response(file: FileAttachmentEntity) {
    return {
      ...file,
      createdAt: file.createdAt.toISOString(),
    };
  }

  private handleError(res: Response, error: unknown): void {
    const message = error instanceof Error ? error.message : "Unexpected attachment error.";
    if (message.includes("not found")) return void res.status(404).json({ error: message });
    if (message.startsWith("Only ") || message.includes("cannot be deleted")) return void res.status(403).json({ error: message });
    if (message.includes("current status")) return void res.status(409).json({ error: message });
    res.status(400).json({ error: message });
  }
}
