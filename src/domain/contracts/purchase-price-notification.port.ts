import type { PurchaseRequisitionEntity } from "../entities/purchase-requisition.entity";

export interface PurchasePriceNotificationPort {
  requested(requisition: PurchaseRequisitionEntity): Promise<void>;
  ready(requisitions: PurchaseRequisitionEntity[]): Promise<void>;
}
