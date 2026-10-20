import { createHash } from "node:crypto";
import type { PurchasePriceNotificationPort } from "../../domain/contracts/purchase-price-notification.port";
import type { PurchaseRequisitionEntity } from "../../domain/entities/purchase-requisition.entity";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";
import type { WhatsAppRealtimeBus } from "../realtime/whatsapp-realtime.bus";

export class PrismaPurchasePriceNotificationAdapter implements PurchasePriceNotificationPort {
  constructor(private readonly realtime: WhatsAppRealtimeBus) {}

  async requested(requisition: PurchaseRequisitionEntity): Promise<void> {
    if (!requisition.assignedBuyerUserId) return;
    await this.create({
      key: `purchase-price-requested:${requisition.id}:${requisition.assignedBuyerUserId}`,
      type: "PURCHASE_PRICE_REQUESTED",
      recipientUserId: requisition.assignedBuyerUserId,
      requisition,
      detail: `${requisition.items.length} partida(s) pendientes de cotizar por Compras.`,
      targetPath: `/procurement/${requisition.id}`,
    });
  }

  async ready(requisitions: PurchaseRequisitionEntity[]): Promise<void> {
    const requisition = requisitions[0];
    if (!requisition) return;
    const awards = requisitions.flatMap((entry) => entry.items.flatMap((item) => item.offers
      .filter((offer) => offer.isSelected)
      .map((offer) => `${entry.id}:${offer.id}:${offer.awardedQty ?? item.qty}:${offer.unitCost}:${offer.currency}:${offer.updatedAt.toISOString()}`))).sort().join(",");
    const awardHash = createHash("sha256").update(awards).digest("hex").slice(0, 24);
    await this.create({
      key: `purchase-price-ready:${requisition.quoteId}:${awardHash}`,
      type: "PURCHASE_PRICE_READY",
      recipientUserId: requisition.requestedByUserId,
      requisition,
      detail: "Compras completó los precios de todas las partidas solicitadas. Revisa los costos y termina la cotización.",
      targetPath: `/quotes/${requisition.quoteId}`,
    });
  }

  private async create(input: {
    key: string;
    type: "PURCHASE_PRICE_REQUESTED" | "PURCHASE_PRICE_READY";
    recipientUserId: string;
    requisition: PurchaseRequisitionEntity;
    detail: string;
    targetPath: string;
  }): Promise<void> {
    let id: string;
    try {
      const row = await prisma.whatsAppInternalAlert.create({
        data: {
          eventKey: input.key.slice(0, 220),
          type: input.type,
          status: "SENT",
          recipientUserId: input.recipientUserId,
          quoteId: input.requisition.quoteId,
          customerName: input.requisition.customerName,
          reference: input.requisition.quoteNumber,
          detail: input.detail,
          targetPath: input.targetPath,
          sentAt: new Date(),
        },
        select: { id: true },
      });
      id = row.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      throw error;
    }
    try {
      await this.realtime.publish({
        type: "SYSTEM_NOTIFICATION_CREATED",
        reason: "SYSTEM_NOTIFICATION_CREATED",
        conversationId: "",
        occurredAt: new Date().toISOString(),
        systemNotification: {
          id,
          recipientUserId: input.recipientUserId,
          type: input.type,
          title: input.type === "PURCHASE_PRICE_REQUESTED" ? "Nueva solicitud de precios" : "Precios de Compras listos",
          message: `${input.requisition.customerName}: ${input.detail}`,
          targetPath: input.targetPath,
        },
      });
    } catch (error) {
      console.error("purchase_price_notification_realtime_failed", { id, error });
    }
  }
}
