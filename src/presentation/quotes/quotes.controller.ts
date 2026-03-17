import { Request, Response } from "express";
import { ChangeQuoteStatusRequestDto } from "../../domain/dtos/request/change-quote-status-request.dto";
import { CreateQuoteItemRequestDto } from "../../domain/dtos/request/create-quote-item-request.dto";
import { CreateQuoteFromExtractionRequestDto } from "../../domain/dtos/request/create-quote-from-extraction-request.dto";
import { CreateQuoteRequestDto } from "../../domain/dtos/request/create-quote-request.dto";
import { GetQuotesQueryRequestDto } from "../../domain/dtos/request/get-quotes-query-request.dto";
import { MatchQuoteItemErpRequestDto } from "../../domain/dtos/request/match-quote-item-erp-request.dto";
import { RegisterQuoteDeliveryAttemptRequestDto } from "../../domain/dtos/request/register-quote-delivery-attempt-request.dto";
import { UpdateQuoteItemRequestDto } from "../../domain/dtos/request/update-quote-item-request.dto";
import { UpdateQuoteRequestDto } from "../../domain/dtos/request/update-quote-request.dto";
import { AddQuoteItemUseCase } from "../../domain/use-cases/add-quote-item.use-case";
import { ChangeQuoteStatusUseCase } from "../../domain/use-cases/change-quote-status.use-case";
import { CreateQuoteUseCase } from "../../domain/use-cases/create-quote.use-case";
import { CreateQuoteFromExtractionUseCase } from "../../domain/use-cases/create-quote-from-extraction.use-case";
import { DeleteQuoteItemUseCase } from "../../domain/use-cases/delete-quote-item.use-case";
import { DownloadQuoteOrderFileUseCase } from "../../domain/use-cases/download-quote-order-file.use-case";
import { GenerateQuoteOrderUseCase } from "../../domain/use-cases/generate-quote-order.use-case";
import { GetQuoteByIdUseCase } from "../../domain/use-cases/get-quote-by-id.use-case";
import { GetQuotesUseCase } from "../../domain/use-cases/get-quotes.use-case";
import { MatchQuoteItemErpUseCase } from "../../domain/use-cases/match-quote-item-erp.use-case";
import { RegisterQuoteDeliveryAttemptUseCase } from "../../domain/use-cases/register-quote-delivery-attempt.use-case";
import { UpdateQuoteItemUseCase } from "../../domain/use-cases/update-quote-item.use-case";
import { UpdateQuoteUseCase } from "../../domain/use-cases/update-quote.use-case";

export class QuotesController {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    private readonly createQuoteFromExtractionUseCase: CreateQuoteFromExtractionUseCase,
    private readonly getQuotesUseCase: GetQuotesUseCase,
    private readonly getQuoteByIdUseCase: GetQuoteByIdUseCase,
    private readonly updateQuoteUseCase: UpdateQuoteUseCase,
    private readonly addQuoteItemUseCase: AddQuoteItemUseCase,
    private readonly matchQuoteItemErpUseCase: MatchQuoteItemErpUseCase,
    private readonly updateQuoteItemUseCase: UpdateQuoteItemUseCase,
    private readonly deleteQuoteItemUseCase: DeleteQuoteItemUseCase,
    private readonly changeQuoteStatusUseCase: ChangeQuoteStatusUseCase,
    private readonly registerQuoteDeliveryAttemptUseCase: RegisterQuoteDeliveryAttemptUseCase,
    private readonly downloadQuoteOrderFileUseCase: DownloadQuoteOrderFileUseCase,
    private readonly generateQuoteOrderUseCase: GenerateQuoteOrderUseCase
  ) {}

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
      message === "Quote is already in the requested status." ||
      message.startsWith("Invalid status transition") ||
      message === "Quote must contain at least one item before moving to QUOTED." ||
      message === "Quote must be APPROVED to generate order." ||
      message === "Order was already generated for this quote." ||
      message === "Quote must contain at least one item before generating order." ||
      message === "Quote must be sent before moving to APPROVED or REJECTED." ||
      message === "Quote must be QUOTED, APPROVED or REJECTED to register delivery attempts." ||
      message === "Order file is not available for this quote." ||
      message === "All quote items must have an ERP product code to generate order file."
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
