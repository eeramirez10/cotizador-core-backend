import type { NextFunction, Request, Response } from "express";
import { runtimeSystemSettings } from "../../infrastructure/config/runtime-system-settings";

export const refreshSystemSettings = async (
  _req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await runtimeSystemSettings.refresh();
  } catch (error) {
    console.error("system_settings_refresh_failed", error);
  }
  next();
};
