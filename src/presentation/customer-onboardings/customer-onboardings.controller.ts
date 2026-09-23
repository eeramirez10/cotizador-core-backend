import type { Request, Response } from "express";
import { CustomerOnboardingUseCase, type CustomerOnboardingWriteInput } from "../../domain/use-cases/customer-onboarding.use-case";
import type { CustomerOnboardingStatus } from "../../infrastructure/database/generated/enums";

const STATUSES = new Set<CustomerOnboardingStatus>([
  "COLLECTING", "PENDING_REVIEW", "PENDING_CXC", "READY_FOR_ERP", "ERP_LINKED",
  "REJECTED", "COMPLETED", "CANCELLED",
]);

export class CustomerOnboardingsController {
  constructor(private readonly useCase: CustomerOnboardingUseCase) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const customerId = typeof req.body?.customerId === "string" ? req.body.customerId.trim() : "";
    if (!customerId) return void res.status(400).json({ error: "El cliente es obligatorio." });
    try {
      res.status(201).json(await this.useCase.createManual(customerId, req.user));
    } catch (error) {
      this.handle(error, res);
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
    const rawStatus = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "";
    const status = STATUSES.has(rawStatus as CustomerOnboardingStatus) ? rawStatus as CustomerOnboardingStatus : undefined;
    try {
      res.json(await this.useCase.list(req.user, { status, page, pageSize }));
    } catch {
      res.status(500).json({ error: "No se pudieron consultar las altas de clientes." });
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      res.json(await this.useCase.get(String(req.params.id), req.user));
    } catch (error) {
      this.handle(error, res);
    }
  };

  getForConversation = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      res.json(await this.useCase.getForConversationAsActor(String(req.params.conversationId), req.user));
    } catch (error) { this.handle(error, res); }
  };

  processConversationTaxDocument = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const result = await this.useCase.processWhatsAppTaxDocument(
        String(req.params.conversationId), String(req.params.attachmentId), req.user,
      );
      if ("error" in result) throw new Error(result.error);
      res.json(result);
    } catch (error) { this.handle(error, res); }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      res.json(await this.useCase.update(String(req.params.id), this.payload(req.body), req.user));
    } catch (error) {
      this.handle(error, res);
    }
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      res.json(await this.useCase.complete(String(req.params.id), req.user));
    } catch (error) {
      this.handle(error, res);
    }
  };

  uploadTaxDocument = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    if (!req.file) return void res.status(400).json({ error: "La constancia fiscal en PDF es obligatoria." });
    try {
      res.json(await this.useCase.uploadTaxDocument(String(req.params.id), {
        content: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype,
      }, req.user));
    } catch (error) { this.handle(error, res); }
  };

  downloadTaxDocument = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try {
      const file = await this.useCase.downloadTaxDocument(String(req.params.id), req.user);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
      res.send(Buffer.from(file.content));
    } catch (error) { this.handle(error, res); }
  };

  submitForCxc = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try { res.json(await this.useCase.submitForCxc(String(req.params.id), req.user)); }
    catch (error) { this.handle(error, res); }
  };

  approveForErp = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try { res.json(await this.useCase.approveForErp(String(req.params.id), req.user)); }
    catch (error) { this.handle(error, res); }
  };

  requestCorrection = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try { res.json(await this.useCase.requestCorrection(String(req.params.id), typeof req.body?.reason === "string" ? req.body.reason : "", req.user)); }
    catch (error) { this.handle(error, res); }
  };

  markErpLinked = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    try { res.json(await this.useCase.markErpLinked(String(req.params.id), typeof req.body?.erpCode === "string" ? req.body.erpCode : "", req.user)); }
    catch (error) { this.handle(error, res); }
  };

  private payload(value: unknown): CustomerOnboardingWriteInput {
    const body = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const fields: Array<keyof CustomerOnboardingWriteInput> = [
      "legalName", "taxId", "taxRegime", "cfdiUse", "billingStreet", "billingExteriorNumber",
      "billingInteriorNumber", "billingNeighborhood", "billingCity", "billingState", "billingPostalCode",
      "billingCountry", "contactName", "contactEmail", "contactPhone", "contactWhatsapp",
    ];
    return Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, typeof body[field] === "string" ? body[field] : null]));
  }

  private handle(error: unknown, res: Response): void {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    if (message === "CUSTOMER_ONBOARDING_NOT_FOUND") return void res.status(404).json({ error: "Expediente no encontrado." });
    if (message === "ATTACHMENT_NOT_FOUND" || message === "ATTACHMENT_FILE_NOT_FOUND") return void res.status(404).json({ error: "No se encontró el archivo en esta conversación." });
    if (message === "CUSTOMER_NOT_AVAILABLE_FOR_ONBOARDING") return void res.status(404).json({ error: "El cliente local no existe o no está disponible en tu sucursal." });
    if (message.startsWith("CUSTOMER_ONBOARDING_INCOMPLETE:")) return void res.status(400).json({ error: "El expediente todavía tiene campos obligatorios pendientes.", missingFields: message.split(":")[1]?.split(",") || [] });
    if (message === "CUSTOMER_TAX_ID_ALREADY_EXISTS") return void res.status(409).json({ error: "Ya existe otro cliente activo con ese RFC." });
    if (message === "ERP_CUSTOMER_ONBOARDING_NOT_ALLOWED") return void res.status(400).json({ error: "Los clientes ERP deben actualizarse en su sistema maestro." });
    if (message === "CUSTOMER_ONBOARDING_ADMIN_REQUIRED") return void res.status(403).json({ error: "Esta acción requiere autorización de Crédito y Cobranza o administrador." });
    if (message === "CUSTOMER_ONBOARDING_NOT_READY_FOR_ERP") return void res.status(400).json({ error: "El expediente todavía no está listo para registrarse en ERP." });
    if (message === "ERP_CODE_REQUIRED") return void res.status(400).json({ error: "El código asignado en Proscai es obligatorio." });
    if (message === "ERP_CUSTOMER_CODE_NOT_FOUND") return void res.status(404).json({ error: "El código no existe en Proscai. Verifica el alta antes de vincular." });
    if (message === "ERP_CUSTOMER_TAX_ID_MISMATCH") return void res.status(409).json({ error: "El RFC del cliente en Proscai no coincide con el expediente fiscal." });
    if (message === "ERP_CUSTOMER_ALREADY_LINKED") return void res.status(409).json({ error: "Ese cliente de Proscai ya está vinculado a otro cliente local." });
    if (message === "CUSTOMER_ONBOARDING_NOT_PENDING_CXC") return void res.status(409).json({ error: "El expediente no está pendiente de revisión por Crédito y Cobranza." });
    if (message === "CUSTOMER_ONBOARDING_REVIEW_NOTE_REQUIRED") return void res.status(400).json({ error: "Explica la corrección requerida (entre 10 y 1000 caracteres)." });
    if (message === "ERP_CUSTOMER_LOOKUP_UNAVAILABLE" || message.startsWith("ERP_CUSTOMER_LOOKUP_FAILED:") || message === "ERP_CUSTOMER_LOOKUP_INVALID_RESPONSE") return void res.status(503).json({ error: "No se pudo verificar el cliente en Proscai. Intenta más tarde." });
    if (message === "TAX_DOCUMENT_MUST_BE_PDF") return void res.status(400).json({ error: "La Constancia de Situación Fiscal debe estar en formato PDF." });
    if (message === "TAX_DOCUMENT_NOT_FOUND") return void res.status(404).json({ error: "No se encontró la constancia fiscal del expediente." });
    if (message === "CUSTOMER_ONBOARDING_LOCKED") return void res.status(409).json({ error: "El expediente ya fue enviado a revisión y no puede modificarse con este permiso." });
    res.status(400).json({ error: message });
  }
}
