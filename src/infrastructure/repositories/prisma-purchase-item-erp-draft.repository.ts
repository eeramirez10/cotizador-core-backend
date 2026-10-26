import type { ErpDraftData } from "../../domain/use-cases/purchase-item-erp-draft.validation";
import { PurchaseItemErpDraftRepository } from "../../domain/repositories/purchase-item-erp-draft.repository";
import { prisma } from "../database/prisma-client";

export class PrismaPurchaseItemErpDraftRepository extends PurchaseItemErpDraftRepository {
  findByItemId(itemId: string) {
    return prisma.purchaseRequisitionItemErpDraft.findUnique({ where: { requisitionItemId: itemId } });
  }

  save(itemId: string, data: ErpDraftData, userId: string) {
    return prisma.purchaseRequisitionItemErpDraft.upsert({
      where: { requisitionItemId: itemId },
      create: { requisitionItemId: itemId, data, updatedByUserId: userId },
      update: { data, updatedByUserId: userId },
    });
  }
}
