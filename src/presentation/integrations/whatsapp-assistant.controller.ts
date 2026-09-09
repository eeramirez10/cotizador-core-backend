import type { Request, Response } from "express";
import type { ExecuteWhatsAppAssistantToolUseCase } from "../../domain/use-cases/execute-whatsapp-assistant-tool.use-case";

export class WhatsAppAssistantController {
  constructor(private readonly executeTool: ExecuteWhatsAppAssistantToolUseCase) {}

  execute = async (req: Request, res: Response): Promise<void> => {
    const conversationId = typeof req.body?.conversationId === "string" ? req.body.conversationId.trim() : "";
    const turnId = typeof req.body?.turnId === "string" ? req.body.turnId.trim() : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const args = req.body?.arguments && typeof req.body.arguments === "object" && !Array.isArray(req.body.arguments)
      ? req.body.arguments as Record<string, unknown>
      : {};
    if (!conversationId || !turnId || !name) {
      res.status(400).json({ error: "conversationId, turnId and name are required." });
      return;
    }
    try {
      res.status(200).json({ result: await this.executeTool.execute(conversationId, turnId, name, args) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Assistant tool failed.";
      res.status(message === "QUOTE_NOT_FOUND_OR_NOT_AUTHORIZED" ? 404 : 400).json({ error: message });
    }
  };
}
