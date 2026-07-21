import { NextFunction, Request, Response } from "express";
import { JwtAdapter } from "../../infrastructure/adapters/jwt.adapter";
import { prisma } from "../../infrastructure/database/prisma-client";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, branchId: true, erpUserCode: true, isActive: true },
    });

    if (!user?.isActive) {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }

    req.user = {
      id: user.id,
      role: user.role,
      branchId: user.branchId,
      erpUserCode: user.erpUserCode,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
};
