import type {
  Currency,
  ProductProcurementStatus,
  UserRole,
} from "../../infrastructure/database/generated/enums";
import type {
  LocalProductProcurementEntity,
  LocalProductProcurementOfferEntity,
} from "../entities/local-product-procurement.entity";

export interface ProcurementAccessScope {
  role: UserRole;
  branchId: string;
}

export interface FindProcurementProductsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: ProductProcurementStatus;
  scope: ProcurementAccessScope;
}

export interface FindProcurementProductsResult {
  items: LocalProductProcurementEntity[];
  total: number;
}

export interface SaveProcurementOfferParams {
  productId: string;
  offerId?: string;
  supplierName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  unitCost: number;
  currency: Currency;
  minimumQty: number | null;
  deliveryTime: string | null;
  validUntil: Date | null;
  notes: string | null;
  actorUserId: string;
  scope: ProcurementAccessScope;
}

export abstract class LocalProductProcurementDatasource {
  abstract findPaginated(params: FindProcurementProductsParams): Promise<FindProcurementProductsResult>;
  abstract findById(
    productId: string,
    scope: ProcurementAccessScope,
  ): Promise<LocalProductProcurementEntity | null>;
  abstract createOffer(params: SaveProcurementOfferParams): Promise<LocalProductProcurementOfferEntity | null>;
  abstract updateOffer(params: SaveProcurementOfferParams & { offerId: string }): Promise<LocalProductProcurementOfferEntity | null>;
  abstract deactivateOffer(
    offerId: string,
    actorUserId: string,
    scope: ProcurementAccessScope,
  ): Promise<boolean>;
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
