import type { Request, Response } from "express";
import { UpdateManagerReportSubscriptionStatusRequestDto } from "../../domain/dtos/request/update-manager-report-subscription-status-request.dto";
import { UpsertManagerReportSubscriptionRequestDto } from "../../domain/dtos/request/upsert-manager-report-subscription-request.dto";
import { ManagerReportSubscriptionsUseCase } from "../../domain/use-cases/manager-report-subscriptions.use-case";
import type { SendManagerReportNowUseCase } from "../../domain/use-cases/send-manager-report-now.use-case";

export class ReportSubscriptionsController {
  constructor(
    private readonly useCase: ManagerReportSubscriptionsUseCase,
    private readonly sendNowUseCase: SendManagerReportNowUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const rows = await this.useCase.list(req.user);
      res.status(200).json(rows.map((row) => row.toJSON()));
    } catch (error) {
      this.handleError(res, error, "Unexpected error while listing report subscriptions.");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [bodyError, dto] = UpsertManagerReportSubscriptionRequestDto.create(req.body);
    if (bodyError) return void res.status(400).json({ error: bodyError });
    try {
      const row = await this.useCase.create(dto!, req.user);
      res.status(201).json(row.toJSON());
    } catch (error) {
      this.handleError(res, error, "Unexpected error while creating report subscription.");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req.params.id);
    if (!id) return void res.status(400).json({ error: "Report subscription id is required." });
    const [bodyError, dto] = UpsertManagerReportSubscriptionRequestDto.create(req.body);
    if (bodyError) return void res.status(400).json({ error: bodyError });
    try {
      const row = await this.useCase.update(id, dto!, req.user);
      res.status(200).json(row.toJSON());
    } catch (error) {
      this.handleError(res, error, "Unexpected error while updating report subscription.");
    }
  };

  setActive = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req.params.id);
    if (!id) return void res.status(400).json({ error: "Report subscription id is required." });
    const [bodyError, dto] = UpdateManagerReportSubscriptionStatusRequestDto.create(req.body);
    if (bodyError) return void res.status(400).json({ error: bodyError });
    try {
      const row = await this.useCase.setActive(id, dto!.isActive, req.user);
      res.status(200).json(row.toJSON());
    } catch (error) {
      this.handleError(res, error, "Unexpected error while changing report subscription status.");
    }
  };

  sendNow = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req.params.id);
    if (!id) return void res.status(400).json({ error: "Report subscription id is required." });
    try {
      const result = await this.sendNowUseCase.execute(id, req.user);
      res.status(200).json(result);
    } catch (error) {
      this.handleError(res, error, "Unexpected error while sending the management report.");
    }
  };

  private id(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0]?.trim() || "" : value?.trim() || "";
  }

  private handleError(res: Response, error: unknown, fallback: string): void {
    const message = error instanceof Error ? error.message : fallback;
    if (message === "Report subscription not found.") return void res.status(404).json({ error: message });
    if (message === "The recipient already has this report subscription.") return void res.status(409).json({ error: message });
    if (
      message.startsWith("Only ADMIN")
      || message.startsWith("Report recipient")
      || message.startsWith("The report recipient")
      || message.startsWith("Report branch")
      || message.startsWith("Branch is required")
      || message.startsWith("Activate the report")
      || message.startsWith("WhatsApp delivery")
      || message.startsWith("Twilio WhatsApp")
      || message.startsWith("The approved manager")
      || message.startsWith("The manager report")
    ) return void res.status(400).json({ error: message });
    console.error("report_subscriptions_failed", error);
    res.status(500).json({ error: fallback });
  }
}
