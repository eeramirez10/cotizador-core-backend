import { Request, Response } from "express";
import { ChangeQuoteStatusRequestDto } from "../../domain/dtos/request/change-quote-status-request.dto";
import { ArchiveQuoteRequestDto } from "../../domain/dtos/request/archive-quote-request.dto";
import { DeleteQuoteRequestDto } from "../../domain/dtos/request/delete-quote-request.dto";
import { CreateQuoteItemRequestDto } from "../../domain/dtos/request/create-quote-item-request.dto";
import { CreateQuoteFromExtractionRequestDto } from "../../domain/dtos/request/create-quote-from-extraction-request.dto";
import { CreateQuoteRequestDto } from "../../domain/dtos/request/create-quote-request.dto";
import { CreateQuoteRevisionRequestDto } from "../../domain/dtos/request/create-quote-revision-request.dto";
import { GetQuotesQueryRequestDto } from "../../domain/dtos/request/get-quotes-query-request.dto";
import { MatchQuoteItemErpRequestDto } from "../../domain/dtos/request/match-quote-item-erp-request.dto";
import { RegisterQuoteDeliveryAttemptRequestDto } from "../../domain/dtos/request/register-quote-delivery-attempt-request.dto";
import { RegisterErpQuoteRequestDto } from "../../domain/dtos/request/register-erp-quote-request.dto";
import { SaveQuoteDraftRequestDto } from "../../domain/dtos/request/save-quote-draft-request.dto";
import { UpdateQuoteItemRequestDto } from "../../domain/dtos/request/update-quote-item-request.dto";
import { UpdateQuoteProcurementReferenceRequestDto } from "../../domain/dtos/request/update-quote-procurement-reference-request.dto";
import { UpdateQuoteRequestDto } from "../../domain/dtos/request/update-quote-request.dto";
import { AddQuoteItemUseCase } from "../../domain/use-cases/add-quote-item.use-case";
import { ChangeQuoteStatusUseCase } from "../../domain/use-cases/change-quote-status.use-case";
import { ArchiveQuoteUseCase } from "../../domain/use-cases/archive-quote.use-case";
import { RestoreQuoteUseCase } from "../../domain/use-cases/restore-quote.use-case";
import { DeleteQuoteUseCase } from "../../domain/use-cases/delete-quote.use-case";
import { CreateQuoteUseCase } from "../../domain/use-cases/create-quote.use-case";
import { CreateQuoteRevisionUseCase } from "../../domain/use-cases/create-quote-revision.use-case";
import { CreateQuoteFromExtractionUseCase } from "../../domain/use-cases/create-quote-from-extraction.use-case";
import { DeleteQuoteItemUseCase } from "../../domain/use-cases/delete-quote-item.use-case";
import { DownloadQuoteOrderFileUseCase } from "../../domain/use-cases/download-quote-order-file.use-case";
import { GenerateQuoteOrderUseCase } from "../../domain/use-cases/generate-quote-order.use-case";
import { GetQuoteByIdUseCase } from "../../domain/use-cases/get-quote-by-id.use-case";
import { GetQuotesUseCase } from "../../domain/use-cases/get-quotes.use-case";
import { MatchQuoteItemErpUseCase } from "../../domain/use-cases/match-quote-item-erp.use-case";
import { RegisterQuoteDeliveryAttemptUseCase } from "../../domain/use-cases/register-quote-delivery-attempt.use-case";
import { RegisterErpQuoteUseCase } from "../../domain/use-cases/register-erp-quote.use-case";
import { SaveQuoteDraftUseCase } from "../../domain/use-cases/save-quote-draft.use-case";
import { UpdateQuoteItemUseCase } from "../../domain/use-cases/update-quote-item.use-case";
import { UpdateQuoteProcurementReferenceUseCase } from "../../domain/use-cases/update-quote-procurement-reference.use-case";
import { UpdateQuoteUseCase } from "../../domain/use-cases/update-quote.use-case";

export class QuotesController {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    private readonly saveQuoteDraftUseCase: SaveQuoteDraftUseCase,
    private readonly createQuoteFromExtractionUseCase: CreateQuoteFromExtractionUseCase,
    private readonly createQuoteRevisionUseCase: CreateQuoteRevisionUseCase,
    private readonly archiveQuoteUseCase: ArchiveQuoteUseCase,
    private readonly restoreQuoteUseCase: RestoreQuoteUseCase,
    private readonly deleteQuoteUseCase: DeleteQuoteUseCase,
    private readonly getQuotesUseCase: GetQuotesUseCase,
    private readonly getQuoteByIdUseCase: GetQuoteByIdUseCase,
    private readonly updateQuoteUseCase: UpdateQuoteUseCase,
    private readonly addQuoteItemUseCase: AddQuoteItemUseCase,
    private readonly matchQuoteItemErpUseCase: MatchQuoteItemErpUseCase,
    private readonly updateQuoteItemUseCase: UpdateQuoteItemUseCase,
    private readonly updateQuoteProcurementReferenceUseCase: UpdateQuoteProcurementReferenceUseCase,
    private readonly deleteQuoteItemUseCase: DeleteQuoteItemUseCase,
    private readonly changeQuoteStatusUseCase: ChangeQuoteStatusUseCase,
    private readonly registerQuoteDeliveryAttemptUseCase: RegisterQuoteDeliveryAttemptUseCase,
    private readonly downloadQuoteOrderFileUseCase: DownloadQuoteOrderFileUseCase,
    private readonly generateQuoteOrderUseCase: GenerateQuoteOrderUseCase,
    private readonly registerErpQuoteUseCase: RegisterErpQuoteUseCase
  ) {}

  saveDraft = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const clientDraftId = this.getSingleParam(req.params.clientDraftId)?.trim();
    if (!clientDraftId) return void res.status(400).json({ error: "clientDraftId is required." });

    const [bodyError, bodyDto] = SaveQuoteDraftRequestDto.create(req.body);
    if (bodyError) return void res.status(400).json({ error: bodyError });

    try {
      const result = await this.saveQuoteDraftUseCase.execute(clientDraftId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while saving quote draft.");
    }
  };

  archive = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) return void res.status(400).json({ error: "Quote id is required." });
    const [bodyError, bodyDto] = ArchiveQuoteRequestDto.create(req.body);
    if (bodyError) return void res.status(400).json({ error: bodyError });
    try {
      const result = await this.archiveQuoteUseCase.execute(quoteId, bodyDto!, req.user);
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while archiving quote.");
    }
  };

  restore = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) return void res.status(400).json({ error: "Quote id is required." });
    try {
      const result = await this.restoreQuoteUseCase.execute(quoteId, req.user);
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while restoring quote.");
    }
  };

  deletePermanently = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) return void res.status(400).json({ error: "Quote id is required." });
    const [bodyError, bodyDto] = DeleteQuoteRequestDto.create(req.body);
    if (bodyError) return void res.status(400).json({ error: bodyError });
    try {
      await this.deleteQuoteUseCase.execute(quoteId, bodyDto!, req.user);
      res.status(204).send();
    } catch (err) {
      this.handleError(res, err, "Unexpected error while deleting quote.");
    }
  };

  createRevision = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) {
      res.status(400).json({ error: "Quote id is required." });
      return;
    }

    const [bodyError, bodyDto] = CreateQuoteRevisionRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.createQuoteRevisionUseCase.execute(quoteId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(201).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while creating quote revision.");
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [queryError, queryDto] = GetQuotesQueryRequestDto.create(req.query);
    if (queryError) {
      res.status(400).json({ error: queryError });
      return;
    }

    try {
      const result = await this.getQuotesUseCase.execute(queryDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while listing quotes.");
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) {
      res.status(400).json({ error: "Quote id is required." });
      return;
    }

    try {
      const result = await this.getQuoteByIdUseCase.execute(quoteId, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while getting quote.");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [bodyError, bodyDto] = CreateQuoteRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.createQuoteUseCase.execute(bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(201).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while creating quote.");
    }
  };

  createFromExtraction = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [bodyError, bodyDto] = CreateQuoteFromExtractionRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.createQuoteFromExtractionUseCase.execute(bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(201).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while creating quote from extraction.");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) {
      res.status(400).json({ error: "Quote id is required." });
      return;
    }

    const [bodyError, bodyDto] = UpdateQuoteRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.updateQuoteUseCase.execute(quoteId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while updating quote.");
    }
  };

  addItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) {
      res.status(400).json({ error: "Quote id is required." });
      return;
    }

    const [bodyError, bodyDto] = CreateQuoteItemRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.addQuoteItemUseCase.execute(quoteId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while adding quote item.");
    }
  };

  updateItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    const itemId = this.getSingleParam(req.params.itemId);
    if (!quoteId || !itemId) {
      res.status(400).json({ error: "Quote id and item id are required." });
      return;
    }

    const [bodyError, bodyDto] = UpdateQuoteItemRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.updateQuoteItemUseCase.execute(quoteId, itemId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while updating quote item.");
    }
  };

  updateProcurementReference = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const quoteId = this.getSingleParam(req.params.id);
    const itemId = this.getSingleParam(req.params.itemId);
    if (!quoteId || !itemId) {
      return void res.status(400).json({ error: "Quote id and item id are required." });
    }

    const [bodyError, bodyDto] = UpdateQuoteProcurementReferenceRequestDto.create(req.body);
    if (bodyError) return void res.status(400).json({ error: bodyError });

    try {
      const result = await this.updateQuoteProcurementReferenceUseCase.execute(quoteId, itemId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while updating purchasing reference.");
    }
  };

  matchItemErp = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    const itemId = this.getSingleParam(req.params.itemId);
    if (!quoteId || !itemId) {
      res.status(400).json({ error: "Quote id and item id are required." });
      return;
    }

    const [bodyError, bodyDto] = MatchQuoteItemErpRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.matchQuoteItemErpUseCase.execute(quoteId, itemId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while matching ERP product.");
    }
  };

  removeItem = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    const itemId = this.getSingleParam(req.params.itemId);
    if (!quoteId || !itemId) {
      res.status(400).json({ error: "Quote id and item id are required." });
      return;
    }

    try {
      const result = await this.deleteQuoteItemUseCase.execute(quoteId, itemId, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while deleting quote item.");
    }
  };

  changeStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) {
      res.status(400).json({ error: "Quote id is required." });
      return;
    }

    const [bodyError, bodyDto] = ChangeQuoteStatusRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.changeQuoteStatusUseCase.execute(quoteId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while changing quote status.");
    }
  };

  generateOrder = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) {
      res.status(400).json({ error: "Quote id is required." });
      return;
    }

    try {
      const result = await this.generateQuoteOrderUseCase.execute(quoteId, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while generating order.");
    }
  };

  downloadOrderFile = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) {
      res.status(400).json({ error: "Quote id is required." });
      return;
    }

    try {
      const result = await this.downloadQuoteOrderFileUseCase.execute(quoteId, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename=\"${result.fileName}\"`);
      res.status(200).send(result.content);
    } catch (err) {
      this.handleError(res, err, "Unexpected error while downloading order file.");
    }
  };

  registerDeliveryAttempt = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) {
      res.status(400).json({ error: "Quote id is required." });
      return;
    }

    const [bodyError, bodyDto] = RegisterQuoteDeliveryAttemptRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.registerQuoteDeliveryAttemptUseCase.execute(quoteId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while recording quote delivery.");
    }
  };

  registerErpQuote = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });

    const quoteId = this.getSingleParam(req.params.id);
    if (!quoteId) return void res.status(400).json({ error: "Quote id is required." });

    const [bodyError, bodyDto] = RegisterErpQuoteRequestDto.create(req.body);
    if (bodyError) return void res.status(400).json({ error: bodyError });

    try {
      const result = await this.registerErpQuoteUseCase.execute(quoteId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while registering ERP quote.");
    }
  };

  private getSingleParam(value: string | string[] | undefined): string | null {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length > 0) return value[0];
    return null;
  }

  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    const message = error instanceof Error ? error.message : fallbackMessage;

    if (message === "Branch not found." || message === "Customer not found." || message === "Quote not found.") {
      res.status(404).json({ error: message });
      return;
    }

    if (message === "Quote item not found.") {
      res.status(404).json({ error: message });
      return;
    }

    if (
      message === "branchCode is only allowed for ADMIN." ||
      message === "Quote cannot be edited in current status." ||
      message === "Quote items cannot be edited in current status." ||
      message === "Only SELLER can create a quote revision." ||
      message === "Only an authorized quote can be revised." ||
      message === "A quote with a generated order cannot be revised." ||
      message === "Only the latest active quote version can be revised." ||
      message === "This quote already has an active revision." ||
      message === "Quote status cannot change while a revision is in progress." ||
      message === "Only ADMIN can list archived quotes." ||
      message === "Only ADMIN can archive quotes." ||
      message === "Only ADMIN can restore quotes." ||
      message === "Only ADMIN can permanently delete quotes." ||
      message === "Quote is already archived." ||
      message === "Quote is not archived." ||
      message === "Archived quotes are read-only." ||
      message === "Quote number confirmation does not match." ||
      message === "Only DRAFT or CANCELLED quotes can be permanently deleted." ||
      message === "A quote with a generated order cannot be deleted." ||
      message === "A quote that belongs to a revision chain cannot be deleted." ||
      message === "Quote is already in the requested status." ||
      message.startsWith("Invalid status transition") ||
      message === "Quote must contain at least one item before moving to QUOTED." ||
      message === "Quote source channel is required before moving to QUOTED." ||
      message === "Commercial conditions are required before moving to QUOTED." ||
      message === "All quote items must be linked to an ERP or local product before moving to QUOTED." ||
      message === "All quote items must be reviewed before moving to QUOTED." ||
      message.startsWith("Quote items require review:") ||
      message === "All quote items must have a seller price before moving to QUOTED." ||
      message === "Rejection reason is required before moving to REJECTED." ||
      message === "Rejection comment is required when rejection reason is OTHER." ||
      message === "Quote must be APPROVED to generate order." ||
      message === "Purchase requisition must be READY_FOR_ORDER before generating order." ||
      message === "Order was already generated for this quote." ||
      message === "Order cannot be generated while a quote revision is in progress." ||
      message === "Quote cannot be sent while a revision is in progress." ||
      message === "Quote must contain at least one item before generating order." ||
      message === "Quote must be sent before moving to APPROVED or REJECTED." ||
      message === "Quote must be QUOTED, APPROVED or REJECTED to register delivery attempts." ||
      message === "Order file is not available for this quote." ||
      message === "All quote items must have an ERP product code to generate order file." ||
      message === "Only Excel-imported quotes can be registered in ERP." ||
      message === "Quote must be APPROVED before registering it in ERP." ||
      message === "ERP quote number is already registered." ||
      message === "Items from Excel-imported quotes are read-only." ||
      message === "ERP matching is not available for Excel-imported quotes." ||
      message === "Orders cannot be generated for Excel-imported quotes." ||
      message === "Order files are not available for Excel-imported quotes." ||
      message === "Purchase requisitions cannot be generated for Excel-imported quotes." ||
      message === "Excel-imported quote items cannot be linked to ERP or local products." ||
      message === "Quote capture method and imported currency cannot be changed after Excel import."
      || message === "Only SELLER can update purchasing references."
      || message === "Excel-imported quotes do not generate purchasing references."
      || message === "Purchasing references can only be updated on QUOTED or APPROVED quotes."
      || message === "Purchasing references cannot change while a quote revision is in progress."
      || message === "This quote item does not require purchasing."
      || message === "Purchasing references are locked after the requisition is sent to Purchasing."
    ) {
      res.status(400).json({ error: message });
      return;
    }

    if (message === "Order file not found in outbox.") {
      res.status(404).json({ error: message });
      return;
    }

    res.status(500).json({ error: message || fallbackMessage });
  }
}
