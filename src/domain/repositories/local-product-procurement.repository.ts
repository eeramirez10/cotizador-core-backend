import {
  FindProcurementProductsParams,
  FindProcurementProductsResult,
  LocalProductProcurementDatasource,
  ProcurementAccessScope,
  SaveProcurementOfferParams,
} from "../datasources/local-product-procurement.datasource";
import {
  LocalProductProcurementEntity,
  LocalProductProcurementOfferEntity,
} from "../entities/local-product-procurement.entity";
import type { ProductProcurementStatus } from "../../infrastructure/database/generated/enums";

export abstract class LocalProductProcurementRepository {
  abstract findPaginated(params: FindProcurementProductsParams): Promise<FindProcurementProductsResult>;
  abstract findById(productId: string, scope: ProcurementAccessScope): Promise<LocalProductProcurementEntity | null>;
  abstract createOffer(params: SaveProcurementOfferParams): Promise<LocalProductProcurementOfferEntity | null>;
  abstract updateOffer(params: SaveProcurementOfferParams & { offerId: string }): Promise<LocalProductProcurementOfferEntity | null>;
  abstract deactivateOffer(offerId: string, actorUserId: string, scope: ProcurementAccessScope): Promise<boolean>;
  abstract selectOffer(
    productId: string,
    offerId: string,
    actorUserId: string,
    scope: ProcurementAccessScope,
  ): Promise<LocalProductProcurementEntity | null>;
  abstract updateStatus(
    productId: string,
    status: ProductProcurementStatus,
    notes: string | null,
    actorUserId: string,
    scope: ProcurementAccessScope,
  ): Promise<LocalProductProcurementEntity | null>;
}
