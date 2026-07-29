import { QuoteItemEntity } from "../../entities/quote-item.entity";

export class QuoteItemResponseDto {
  constructor(private readonly item: QuoteItemEntity) {}

  toJSON() {
    return {
      id: this.item.id,
      quoteId: this.item.quoteId,
      clientItemId: this.item.clientItemId,
      productId: this.item.productId,
      externalProductCode: this.item.externalProductCode,
      ean: this.item.ean,
      customerDescription: this.item.customerDescription,
      customerUnit: this.item.customerUnit,
      erpDescription: this.item.erpDescription,
      unit: this.item.unit,
      qty: this.item.qty,
      stock: this.item.stock,
      deliveryTime: this.item.deliveryTime,
      itemComment: this.item.itemComment,
      sellerSupplierId: this.item.sellerSupplierId,
      sellerSupplierNameSnapshot: this.item.sellerSupplierNameSnapshot,
      sellerQuotedUnitCost: this.item.sellerQuotedUnitCost,
      sellerQuotedCurrency: this.item.sellerQuotedCurrency,
      sellerQuotedBrand: this.item.sellerQuotedBrand,
      sellerOriginRestrictions: this.item.sellerOriginRestrictions,
      sellerDeliveryState: this.item.sellerDeliveryState,
      sellerSupplierDeliveryTime: this.item.sellerSupplierDeliveryTime,
      purchaseStandard: this.item.purchaseStandard,
      purchaseDiameter: this.item.purchaseDiameter,
      purchaseThickness: this.item.purchaseThickness,
      purchaseBore: this.item.purchaseBore,
      cost: this.item.cost,
      costCurrency: this.item.costCurrency,
      marginPct: this.item.marginPct,
      sourceCurrency: this.item.sourceCurrency,
      sourceUnitPrice: this.item.sourceUnitPrice,
      sourceSubtotal: this.item.sourceSubtotal,
      unitPrice: this.item.unitPrice,
      subtotal: this.item.subtotal,
      sourceRequiresReview: this.item.sourceRequiresReview,
      requiresReview: this.item.requiresReview,
      createdAt: this.item.createdAt.toISOString(),
      updatedAt: this.item.updatedAt.toISOString(),
      product: this.item.product,
    };
  }
}
