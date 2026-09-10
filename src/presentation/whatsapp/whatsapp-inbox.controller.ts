import type { Request, Response } from "express";
import { GetWhatsAppInboxQueryRequestDto } from "../../domain/dtos/request/get-whatsapp-inbox-query-request.dto";
import { SendWhatsAppInboxMessageRequestDto } from "../../domain/dtos/request/send-whatsapp-inbox-message-request.dto";
import { UpdateWhatsAppConversationModeRequestDto } from "../../domain/dtos/request/update-whatsapp-conversation-mode-request.dto";
import type { SendWhatsAppInboxMessageUseCase } from "../../domain/use-cases/send-whatsapp-inbox-message.use-case";
import type { WhatsAppInboxUseCase } from "../../domain/use-cases/whatsapp-inbox.use-case";

export class WhatsAppInboxController {
  constructor(
    private readonly inbox: WhatsAppInboxUseCase,
    private readonly sendMessageUseCase: SendWhatsAppInboxMessageUseCase,
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

  private id(req: Request): string {
    const value = req.params.id;
    return (Array.isArray(value) ? value[0] : value || "").trim();
  }

  private handleError(res: Response, error: unknown, fallback: string): void {
    const message = error instanceof Error ? error.message : fallback;
    const status = /no encontrad/i.test(message) ? 404
      : /ventana|obligatorio|exceder|toma el control/i.test(message) ? 409
        : 500;
    if (status === 500) console.error("whatsapp_inbox_failed", error);
    res.status(status).json({ error: message || fallback });
  }
}
