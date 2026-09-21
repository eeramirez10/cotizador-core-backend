import type { NextFunction, Request, Response } from "express";
import { runtimeSystemSettings } from "../../infrastructure/config/runtime-system-settings";

export const requireWhatsAppInboxEnabled = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  await runtimeSystemSettings.refresh();
  if (!runtimeSystemSettings.boolean("WHATSAPP_INBOX_ENABLED") || req.user?.whatsappInboxEnabled !== true) {
    res.status(404).json({ error: "Resource not found." });
    return;
  }

  next();
};
