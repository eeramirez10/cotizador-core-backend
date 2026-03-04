import { NextFunction, Request, Response } from "express";
import type { UserRole } from "../../infrastructure/database/generated/enums";

export const requireRoles =
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden." });
      return;
    }

    next();
  };
