import type { NextFunction, Request, Response } from "express";

export const requireInternalApiKey = (expectedKey: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!expectedKey || req.header("x-internal-api-key") !== expectedKey) {
      res.status(401).json({ error: "Invalid internal API key." });
      return;
    }
    next();
  };
};
