import type { ErpDraftData } from "../use-cases/purchase-item-erp-draft.validation";

export interface SavedErpDraft {
  data: unknown;
  updatedAt: Date;
  updatedByUserId: string;
}

export abstract class PurchaseItemErpDraftRepository {
  abstract findByItemId(itemId: string): Promise<SavedErpDraft | null>;
  abstract save(itemId: string, data: ErpDraftData, userId: string): Promise<SavedErpDraft>;
}
