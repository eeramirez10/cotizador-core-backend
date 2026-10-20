import { Router } from "express";
import { prisma } from "../../infrastructure/database/prisma-client";
import { requireAuth } from "../middlewares/auth.middleware";

export class NotificationsRoutes {
  static routes(): Router {
    const router = Router();
    const visibleTypes = ["CUSTOMER_ONBOARDING_ERP_LINKED", "PURCHASE_PRICE_REQUESTED", "PURCHASE_PRICE_READY"] as const;
    const titles = {
      CUSTOMER_ONBOARDING_ERP_LINKED: "Cliente vinculado en ERP",
      PURCHASE_PRICE_REQUESTED: "Nueva solicitud de precios",
      PURCHASE_PRICE_READY: "Precios de Compras listos",
    } as const;
    router.use(requireAuth);

    router.get("/", async (req, res) => {
      if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
      try {
        const rows = await prisma.whatsAppInternalAlert.findMany({
          where: { recipientUserId: req.user.id, type: { in: [...visibleTypes] } },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, type: true, customerName: true, reference: true, detail: true, targetPath: true, createdAt: true, readAt: true },
        });
        res.json({ items: rows.map((row) => ({
          id: row.id,
          type: row.type,
          title: titles[row.type as keyof typeof titles],
          message: `${row.customerName}: ${row.detail}`,
          reference: row.reference,
          targetPath: row.targetPath || "/clients",
          createdAt: row.createdAt,
          readAt: row.readAt,
        })) });
      } catch (error) {
        console.error("system_notifications_list_failed", error);
        res.status(500).json({ error: "No se pudieron consultar las notificaciones." });
      }
    });

    router.patch("/:id/read", async (req, res) => {
      if (!req.user) return void res.status(401).json({ error: "Unauthorized." });
      const id = String(req.params.id || "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return void res.status(400).json({ error: "Identificador de notificación inválido." });
      }
      try {
        const result = await prisma.whatsAppInternalAlert.updateMany({
          where: { id, recipientUserId: req.user.id, type: { in: [...visibleTypes] } },
          data: { readAt: new Date() },
        });
        if (!result.count) return void res.status(404).json({ error: "Notificación no encontrada." });
        res.status(204).send();
      } catch (error) {
        console.error("system_notification_read_failed", error);
        res.status(500).json({ error: "No se pudo marcar la notificación como leída." });
      }
    });
    return router;
  }
}
