import {
  FindProcurementProductsParams,
  LocalProductProcurementDatasource,
  ProcurementAccessScope,
  SaveProcurementOfferParams,
} from "../../domain/datasources/local-product-procurement.datasource";
import { LocalProductProcurementRepository } from "../../domain/repositories/local-product-procurement.repository";
import type { ProductProcurementStatus } from "../database/generated/enums";

export class LocalProductProcurementRepositoryImpl implements LocalProductProcurementRepository {
  constructor(private readonly datasource: LocalProductProcurementDatasource) {}

  findPaginated(params: FindProcurementProductsParams) {
    return this.datasource.findPaginated(params);
  }

  findById(productId: string, scope: ProcurementAccessScope) {
    return this.datasource.findById(productId, scope);
  }

  createOffer(params: SaveProcurementOfferParams) {
    return this.datasource.createOffer(params);
  }

  updateOffer(params: SaveProcurementOfferParams & { offerId: string }) {
    return this.datasource.updateOffer(params);
  }

  deactivateOffer(offerId: string, actorUserId: string, scope: ProcurementAccessScope) {
    return this.datasource.deactivateOffer(offerId, actorUserId, scope);
  }

  selectOffer(productId: string, offerId: string, actorUserId: string, scope: ProcurementAccessScope) {
    return this.datasource.selectOffer(productId, offerId, actorUserId, scope);
  }

  updateStatus(
    productId: string,
    status: ProductProcurementStatus,
    notes: string | null,
    actorUserId: string,
    scope: ProcurementAccessScope,
  ) {
    return this.datasource.updateStatus(productId, status, notes, actorUserId, scope);
  }
}
