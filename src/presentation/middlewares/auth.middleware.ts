import { NextFunction, Request, Response } from "express";
import { JwtAdapter } from "../../infrastructure/adapters/jwt.adapter";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.header("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing bearer token." });
      return;
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      res.status(401).json({ error: "Missing bearer token." });
      return;
    }

    const payload = JwtAdapter.verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      role: payload.role,
      branchId: payload.branchId,
      erpUserCode: payload.erpUserCode,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
};
