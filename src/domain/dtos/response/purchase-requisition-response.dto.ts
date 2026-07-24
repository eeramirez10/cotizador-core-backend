import type { PurchaseRequisitionEntity, SupplierEntity } from "../../entities/purchase-requisition.entity";

export class PurchaseRequisitionResponseDto {
  constructor(private readonly requisition: PurchaseRequisitionEntity) {}

  toJSON() {
    return {
      ...this.requisition,
      submittedAt: this.requisition.submittedAt?.toISOString() ?? null,
      completedAt: this.requisition.completedAt?.toISOString() ?? null,
      costApprovedAt: this.requisition.costApprovedAt?.toISOString() ?? null,
      createdAt: this.requisition.createdAt.toISOString(),
      updatedAt: this.requisition.updatedAt.toISOString(),
      items: this.requisition.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        offers: item.offers.map((offer) => ({
          ...offer,
          validUntil: offer.validUntil?.toISOString().split("T")[0] ?? null,
          quoteDate: offer.quoteDate.toISOString().split("T")[0],
          sentAt: offer.sentAt?.toISOString() ?? null,
          createdAt: offer.createdAt.toISOString(),
          updatedAt: offer.updatedAt.toISOString(),
          supplier: SupplierResponseDto.toJSON(offer.supplier),
        })),
      })),
    };
  }
}

export class SupplierResponseDto {
  static toJSON(supplier: SupplierEntity) {
    return {
      ...supplier,
      erpSyncedAt: supplier.erpSyncedAt?.toISOString() ?? null,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    };
  }
}
