import type { Request, Response } from "express";
import type { GetQuoteCustomerChangeRequestsUseCase } from "../../domain/use-cases/get-quote-customer-change-requests.use-case";

export class QuoteCustomerChangeRequestsController {
  constructor(private readonly useCase: GetQuoteCustomerChangeRequestsUseCase) {}

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const quoteId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!quoteId?.trim()) return void res.status(400).json({ error: "Quote id is required." });
    try {
      const rows = await this.useCase.execute(quoteId.trim(), req.user);
      res.status(200).json(rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error while listing change requests.";
      res.status(message === "Quote not found." ? 404 : 500).json({ error: message });
    }
  };
}
