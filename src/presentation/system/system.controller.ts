import { Request, Response } from "express";
import { UpdateSystemSettingsRequestDto } from "../../domain/dtos/request/update-system-settings-request.dto";
import { ResetSystemSettingsRequestDto } from "../../domain/dtos/request/reset-system-settings-request.dto";
import { ManageSystemSettingsUseCase } from "../../domain/use-cases/manage-system-settings.use-case";
import type { SystemSettingsRuntime } from "../../domain/services/system-settings-runtime";

export class SystemController {
  constructor(
    private readonly settings: ManageSystemSettingsUseCase,
    private readonly runtime: SystemSettingsRuntime,
  ) {}

  capabilities = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.runtime.refresh();
      res.status(200).json({
        quoteInternalApprovalEnabled: this.runtime.boolean("QUOTE_INTERNAL_APPROVAL_ENABLED"),
        requisitionInternalApprovalEnabled: this.runtime.boolean("REQUISITION_INTERNAL_APPROVAL_ENABLED"),
        sellerExcelImportEnabled: this.runtime.boolean("SELLER_EXCEL_IMPORT_ENABLED"),
        whatsAppInboxEnabled: this.runtime.boolean("WHATSAPP_INBOX_ENABLED")
          && req.user?.whatsappInboxEnabled === true,
        whatsAppAssistantEnabled: this.runtime.boolean("WHATSAPP_ASSISTANT_ENABLED"),
        whatsAppHumanTakeoverMinutes: this.runtime.number("WHATSAPP_HUMAN_TAKEOVER_MINUTES"),
      });
    } catch (error) {
      this.error(res, error);
    }
  };

  listSettings = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json(await this.settings.list());
    } catch (error) {
      this.error(res, error);
    }
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [validationError, dto] = UpdateSystemSettingsRequestDto.create(req.body);
    if (validationError || !dto) return void res.status(400).json({ error: validationError });
    try {
      res.status(200).json(await this.settings.update(dto, req.user.id));
    } catch (error) {
      this.error(res, error);
    }
  };

  resetSettings = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [validationError, dto] = ResetSystemSettingsRequestDto.create(req.body);
    if (validationError || !dto) return void res.status(400).json({ error: validationError });
    try {
      res.status(200).json(await this.settings.reset(dto.keys, req.user.id));
    } catch (error) {
      this.error(res, error);
    }
  };

  private error(res: Response, error: unknown): void {
    const message = error instanceof Error ? error.message : "Unexpected system configuration error.";
    res.status(message.includes("no puede superar") ? 400 : 500).json({ error: message });
  }
}
