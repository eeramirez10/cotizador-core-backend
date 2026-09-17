import type { Request, Response } from "express";
import { GetWhatsAppInboxQueryRequestDto } from "../../domain/dtos/request/get-whatsapp-inbox-query-request.dto";
import { SendWhatsAppInboxMessageRequestDto } from "../../domain/dtos/request/send-whatsapp-inbox-message-request.dto";
import { UpdateWhatsAppConversationModeRequestDto } from "../../domain/dtos/request/update-whatsapp-conversation-mode-request.dto";
import { AssignWhatsAppLeadRequestDto } from "../../domain/dtos/request/assign-whatsapp-lead-request.dto";
import { ConvertWhatsAppLeadRequestDto } from "../../domain/dtos/request/convert-whatsapp-lead-request.dto";
import { MarkWhatsAppAttachmentQuoteExtractionRequestDto } from "../../domain/dtos/request/mark-whatsapp-attachment-quote-extraction-request.dto";
import type { AssignWhatsAppLeadUseCase } from "../../domain/use-cases/assign-whatsapp-lead.use-case";
import type { ConvertWhatsAppLeadUseCase } from "../../domain/use-cases/convert-whatsapp-lead.use-case";
import type { SendWhatsAppInboxMessageUseCase } from "../../domain/use-cases/send-whatsapp-inbox-message.use-case";
import type { WhatsAppInboxUseCase } from "../../domain/use-cases/whatsapp-inbox.use-case";
import type { DownloadWhatsAppInboundAttachmentUseCase } from "../../domain/use-cases/download-whatsapp-inbound-attachment.use-case";
import type { MarkWhatsAppInboundAttachmentQuoteExtractionUseCase } from "../../domain/use-cases/mark-whatsapp-inbound-attachment-quote-extraction.use-case";

export class WhatsAppInboxController {
  constructor(
    private readonly inbox: WhatsAppInboxUseCase,
    private readonly sendMessageUseCase: SendWhatsAppInboxMessageUseCase,
    private readonly assignLeadUseCase: AssignWhatsAppLeadUseCase,
    private readonly convertLeadUseCase: ConvertWhatsAppLeadUseCase,
    private readonly downloadAttachmentUseCase: DownloadWhatsAppInboundAttachmentUseCase,
    private readonly markAttachmentQuoteExtractionUseCase: MarkWhatsAppInboundAttachmentQuoteExtractionUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const [error, query] = GetWhatsAppInboxQueryRequestDto.create(req.query);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.inbox.list({ actor: req.user, ...query! });
      res.status(200).json(result);
    } catch (caught) {
      this.handleError(res, caught, "No se pudieron cargar las conversaciones.");
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req);
    if (!id) return void res.status(400).json({ error: "Conversation id is required." });
    try {
      const result = await this.inbox.get(id, req.user);
      if (!result) return void res.status(404).json({ error: "Conversación no encontrada." });
      res.status(200).json(result);
    } catch (caught) {
      this.handleError(res, caught, "No se pudo cargar la conversación.");
    }
  };

  messages = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req);
    if (!id) return void res.status(400).json({ error: "Conversation id is required." });
    const [error, query] = GetWhatsAppInboxQueryRequestDto.create(req.query);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.inbox.messages({
        conversationId: id,
        actor: req.user,
        cursor: query!.cursor,
        after: query!.after,
        pageSize: query!.pageSize,
      });
      res.status(200).json(result);
    } catch (caught) {
      this.handleError(res, caught, "No se pudieron cargar los mensajes.");
    }
  };

  quotes = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req);
    if (!id) return void res.status(400).json({ error: "Conversation id is required." });
    try {
      const result = await this.inbox.quotes(id, req.user);
      if (!result) return void res.status(404).json({ error: "Conversación no encontrada." });
      res.status(200).json({ items: result, total: result.length });
    } catch (caught) {
      this.handleError(res, caught, "No se pudieron cargar las cotizaciones de la conversación.");
    }
  };

  downloadAttachment = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const value = req.params.attachmentId;
    const attachmentId = (Array.isArray(value) ? value[0] : value || "").trim();
    if (!attachmentId) return void res.status(400).json({ error: "Attachment id is required." });
    try {
      const file = await this.downloadAttachmentUseCase.execute(attachmentId, req.user);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Length", String(file.content.byteLength));
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
      res.status(200).send(Buffer.from(file.content));
    } catch (caught) {
      this.handleError(res, caught, "No se pudo abrir el archivo recibido.");
    }
  };

  markAttachmentQuoteExtraction = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const value = req.params.attachmentId;
    const attachmentId = (Array.isArray(value) ? value[0] : value || "").trim();
    if (!attachmentId) return void res.status(400).json({ error: "Attachment id is required." });
    const [error, body] = MarkWhatsAppAttachmentQuoteExtractionRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      const attachment = await this.markAttachmentQuoteExtractionUseCase.execute(
        attachmentId,
        body!.clientDraftId,
        req.user,
      );
      res.status(200).json(attachment);
    } catch (caught) {
      this.handleError(res, caught, "No se pudo registrar la extracción del archivo.");
    }
  };

  send = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req);
    if (!id) return void res.status(400).json({ error: "Conversation id is required." });
    const [error, body] = SendWhatsAppInboxMessageRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.sendMessageUseCase.execute({
        conversationId: id,
        clientMessageId: body!.clientMessageId,
        body: body!.body,
        actor: req.user,
      });
      res.status(201).json(result);
    } catch (caught) {
      this.handleError(res, caught, "No se pudo enviar el mensaje.");
    }
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req);
    if (!id) return void res.status(400).json({ error: "Conversation id is required." });
    try {
      const found = await this.inbox.markRead(id, req.user);
      if (!found) return void res.status(404).json({ error: "Conversación no encontrada." });
      res.status(204).send();
    } catch (caught) {
      this.handleError(res, caught, "No se pudo marcar la conversación como leída.");
    }
  };

  changeMode = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req);
    if (!id) return void res.status(400).json({ error: "Conversation id is required." });
    const [error, body] = UpdateWhatsAppConversationModeRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.inbox.changeMode(id, req.user, body!.mode);
      if (!result) return void res.status(404).json({ error: "Conversación no encontrada." });
      res.status(200).json(result);
    } catch (caught) {
      this.handleError(res, caught, "No se pudo cambiar el modo de atención.");
    }
  };

  assignLead = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req);
    if (!id) return void res.status(400).json({ error: "Conversation id is required." });
    const [error, body] = AssignWhatsAppLeadRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.assignLeadUseCase.execute(id, body!.sellerId, req.user);
      res.status(200).json(result);
    } catch (caught) {
      this.handleError(res, caught, "No se pudo asignar el prospecto.");
    }
  };

  convertLead = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
    const id = this.id(req);
    if (!id) return void res.status(400).json({ error: "Conversation id is required." });
    const [error, body] = ConvertWhatsAppLeadRequestDto.create(req.body);
    if (error) return void res.status(400).json({ error });
    try {
      const result = await this.convertLeadUseCase.execute({
        conversationId: id,
        customerId: body!.customerId,
        customerContactId: body!.customerContactId,
        actor: req.user,
      });
      res.status(200).json(result);
    } catch (caught) {
      this.handleError(res, caught, "No se pudo convertir el prospecto en cliente.");
    }
  };

  private id(req: Request): string {
    const value = req.params.id;
    return (Array.isArray(value) ? value[0] : value || "").trim();
  }

  private handleError(res: Response, error: unknown, fallback: string): void {
    const message = error instanceof Error ? error.message : fallback;
    const status = /no encontrad|not found/i.test(message) ? 404
      : /Only ADMIN|Solo puedes|No puedes reasignar|Solo el vendedor|PURCHASING cannot/i.test(message) ? 403
      : /ventana|obligatorio|exceder|toma el control|no está disponible|ya no se puede asignar|Asigna un vendedor|ya está vinculado|no pertenece/i.test(message) ? 409
        : 500;
    if (status === 500) console.error("whatsapp_inbox_failed", error);
    res.status(status).json({ error: message || fallback });
  }
}
