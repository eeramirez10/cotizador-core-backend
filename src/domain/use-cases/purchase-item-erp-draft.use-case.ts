import type { PurchaseRequisitionActor } from "../datasources/purchase-requisition.datasource";
import type { PurchaseRequisitionRepository } from "../repositories/purchase-requisition.repository";
import type { PurchaseItemErpDraftRepository } from "../repositories/purchase-item-erp-draft.repository";
import { parseErpDraftData } from "./purchase-item-erp-draft.validation";
import { erpDraftBranchDefaults } from "./purchase-item-erp-draft.branch-defaults";

export class ErpDraftAccessError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export class PurchaseItemErpDraftUseCase {
  constructor(
    private readonly requisitions: PurchaseRequisitionRepository,
    private readonly drafts: PurchaseItemErpDraftRepository,
  ) {}

  private async authorize(requisitionId: string, itemId: string, actor: PurchaseRequisitionActor, write: boolean) {
    const requisition = await this.requisitions.findById(requisitionId, actor);
    if (!requisition) throw new ErpDraftAccessError("Requisición no encontrada.", 404);
    const item = requisition.items.find((candidate) => candidate.id === itemId);
    if (!item || item.source !== "LOCAL_NEW") throw new ErpDraftAccessError("Partida local no encontrada.", 404);
    if (write) {
      const sellerCanEdit = actor.role === "SELLER" && requisition.requestedByUserId === actor.id && requisition.status === "DRAFT";
      if (!sellerCanEdit && actor.role !== "ADMIN" && actor.role !== "PURCHASING") {
        throw new ErpDraftAccessError("No tienes permiso para editar esta ficha ERP.", 403);
      }
      if (["COMPLETED", "CANCELLED"].includes(requisition.status) || item.erpLinkedAt) {
        throw new ErpDraftAccessError("La ficha ERP ya no se puede editar para esta partida.", 409);
      }
    }
    return requisition;
  }

  async get(requisitionId: string, itemId: string, actor: PurchaseRequisitionActor) {
    await this.authorize(requisitionId, itemId, actor, false);
    const row = await this.drafts.findByItemId(itemId);
    return row ? { data: row.data, updatedAt: row.updatedAt, updatedByUserId: row.updatedByUserId } : null;
  }

  async save(requisitionId: string, itemId: string, raw: unknown, actor: PurchaseRequisitionActor) {
    const requisition = await this.authorize(requisitionId, itemId, actor, true);
    let data;
    try { data = parseErpDraftData(raw); }
    catch (error) { throw new ErpDraftAccessError(error instanceof Error ? error.message : "Ficha ERP no válida.", 400); }
    const defaults = erpDraftBranchDefaults(requisition.branchCode);
    if (!defaults) throw new ErpDraftAccessError("La sucursal no tiene cuentas y perfiles ERP configurados.", 400);
    const row = await this.drafts.save(itemId, { ...data, ...defaults, productType: 1 }, actor.id);
    return { data: row.data, updatedAt: row.updatedAt, updatedByUserId: row.updatedByUserId };
  }
}
