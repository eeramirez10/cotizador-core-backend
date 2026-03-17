import { Request, Response } from "express";
import { CreateLocalProductsFromItemsRequestDto } from "../../domain/dtos/request/create-local-products-from-items-request.dto";
import { CreateLocalTempProductRequestDto } from "../../domain/dtos/request/create-local-temp-product-request.dto";
import { GetProductsQueryRequestDto } from "../../domain/dtos/request/get-products-query-request.dto";
import { UpdateLocalTempProductRequestDto } from "../../domain/dtos/request/update-local-temp-product-request.dto";
import { CreateLocalProductsFromItemsUseCase } from "../../domain/use-cases/create-local-products-from-items.use-case";
import { CreateLocalTempProductUseCase } from "../../domain/use-cases/create-local-temp-product.use-case";
import { DeleteLocalTempProductUseCase } from "../../domain/use-cases/delete-local-temp-product.use-case";
import { GetProductsUseCase } from "../../domain/use-cases/get-products.use-case";
import { UpdateLocalTempProductUseCase } from "../../domain/use-cases/update-local-temp-product.use-case";

export class LocalProductsController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly createLocalTempProductUseCase: CreateLocalTempProductUseCase,
    private readonly createLocalProductsFromItemsUseCase: CreateLocalProductsFromItemsUseCase,
    private readonly updateLocalTempProductUseCase: UpdateLocalTempProductUseCase,
    private readonly deleteLocalTempProductUseCase: DeleteLocalTempProductUseCase
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [queryError, queryDto] = GetProductsQueryRequestDto.create({
      ...req.query,
      source: "LOCAL_TEMP",
    });
    if (queryError) {
      res.status(400).json({ error: queryError });
      return;
    }

    try {
      const result = await this.getProductsUseCase.execute(queryDto!, {
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while listing local products.");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [bodyError, bodyDto] = CreateLocalTempProductRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.createLocalTempProductUseCase.execute(bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(201).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while creating local product.");
    }
  };

  createFromItems = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [bodyError, bodyDto] = CreateLocalProductsFromItemsRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.createLocalProductsFromItemsUseCase.execute(bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(201).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while creating local products from items.");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const productId = String(req.params.id ?? "").trim();
    if (!productId || productId.trim().length === 0) {
      res.status(400).json({ error: "Product id is required." });
      return;
    }

    const [bodyError, bodyDto] = UpdateLocalTempProductRequestDto.create(req.body);
    if (bodyError) {
      res.status(400).json({ error: bodyError });
      return;
    }

    try {
      const result = await this.updateLocalTempProductUseCase.execute(productId, bodyDto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(200).json(result.toJSON());
    } catch (err) {
      this.handleError(res, err, "Unexpected error while updating local product.");
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const productId = String(req.params.id ?? "").trim();
    if (!productId || productId.trim().length === 0) {
      res.status(400).json({ error: "Product id is required." });
      return;
    }

    try {
      await this.deleteLocalTempProductUseCase.execute(productId, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(204).send();
    } catch (err) {
      this.handleError(res, err, "Unexpected error while deleting local product.");
    }
  };

  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    const message = error instanceof Error ? error.message : fallbackMessage;

    if (message === "Branch not found.") {
      res.status(404).json({ error: message });
      return;
    }

    if (message === "branchCode is only allowed for ADMIN.") {
      res.status(400).json({ error: message });
      return;
    }

    if (message === "Local temp product not found.") {
      res.status(404).json({ error: message });
      return;
    }

    res.status(500).json({ error: fallbackMessage });
  }
}
