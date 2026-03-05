import { QuoteItemEntity } from "../../entities/quote-item.entity";

export class QuoteItemResponseDto {
  constructor(private readonly item: QuoteItemEntity) {}

  toJSON() {
    return {
      id: this.item.id,
      quoteId: this.item.quoteId,
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
      cost: this.item.cost,
      costCurrency: this.item.costCurrency,
      marginPct: this.item.marginPct,
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
