import type { NextFunction, Request, Response } from "express";

export const requireDevelopment = (_req: Request, res: Response, next: NextFunction): void => {
  if ((process.env.NODE_ENV || "").toLowerCase() !== "development") {
    res.status(404).json({ error: "Not found." });
    return;
  }
  next();
};
