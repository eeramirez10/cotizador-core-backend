import {
  LocalProductProcurementEntity,
  LocalProductProcurementOfferEntity,
} from "../../entities/local-product-procurement.entity";

export class LocalProductProcurementResponseDto {
  constructor(private readonly product: LocalProductProcurementEntity) {}

  toJSON() {
    return {
      ...this.product,
      procurementUpdatedAt: this.product.procurementUpdatedAt?.toISOString() ?? null,
      createdAt: this.product.createdAt.toISOString(),
      updatedAt: this.product.updatedAt.toISOString(),
      offers: this.product.offers.map((offer) => this.offer(offer)),
    };
  }

  private offer(offer: LocalProductProcurementOfferEntity) {
    return {
      ...offer,
      validUntil: offer.validUntil?.toISOString().slice(0, 10) ?? null,
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt.toISOString(),
    };
  }
}

export class PaginatedLocalProductProcurementResponseDto {
  constructor(
    private readonly items: LocalProductProcurementEntity[],
    private readonly total: number,
    private readonly page: number,
    private readonly pageSize: number,
  ) {}

  toJSON() {
    const totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
    return {
      items: this.items.map((item) => new LocalProductProcurementResponseDto(item).toJSON()),
      total: this.total,
      page: this.page,
      pageSize: this.pageSize,
      totalPages,
      hasPrevPage: this.page > 1,
      hasNextPage: this.page < totalPages,
    };
  }
}
