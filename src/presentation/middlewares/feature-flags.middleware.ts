import type { NextFunction, Request, Response } from "express";
import { Envs } from "../../config/envs";

export const requireWhatsAppInboxEnabled = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!Envs.whatsAppInboxEnabled) {
    res.status(404).json({ error: "Resource not found." });
    return;
  }

  next();
};
