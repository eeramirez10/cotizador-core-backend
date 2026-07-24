import type {
  Currency,
  PurchaseCostSource,
  PurchaseRequisitionStatus,
  SupplierScope,
  UserRole,
} from "../../infrastructure/database/generated/enums";
import type { PurchaseRequisitionEntity, SupplierEntity } from "../entities/purchase-requisition.entity";
import type { QuoteEntity } from "../entities/quote.entity";

export interface PurchaseRequisitionActor {
  id: string;
  role: UserRole;
  branchId: string;
}

export interface FindPurchaseRequisitionsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: PurchaseRequisitionStatus;
  actor: PurchaseRequisitionActor;
}

export interface FindPurchaseRequisitionsResult {
  items: PurchaseRequisitionEntity[];
  total: number;
}

export interface UpdatePurchaseRequisitionItemData {
  standard?: string | null;
  diameter?: string | null;
  thickness?: string | null;
  bore?: string | null;
  sellerUnitCost?: number;
  sellerCurrency?: Currency;
  sellerCostSource?: PurchaseCostSource;
  sellerBrand?: string | null;
  originRestrictions?: string[];
  sellerDeliveryTime?: string | null;
  deliveryPlace?: string | null;
}

export interface LinkPurchaseRequisitionItemToErpData {
  erpCode: string;
  erpEan: string;
  actorUserId: string;
}

export interface SaveSupplierData {
  erpCode: string | null;
  name: string;
  canonicalName: string;
  scope: SupplierScope;
  country: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  actorUserId: string;
}

export interface SavePurchaseSupplierOfferData {
  requisitionItemId: string;
  supplierId: string;
  qty: number;
  unitCost: number;
  currency: Currency;
  exchangeRate: number | null;
  taxRate: number;
  brand: string | null;
  origin: string | null;
  deliveryTime: string | null;
  validUntil: Date | null;
  quoteDate: Date;
  externalReference: string | null;
  notes: string | null;
  actorUserId: string;
}

export abstract class PurchaseRequisitionDatasource {
  abstract ensureForApprovedQuote(quote: QuoteEntity): Promise<PurchaseRequisitionEntity | null>;
  abstract findPaginated(params: FindPurchaseRequisitionsParams): Promise<FindPurchaseRequisitionsResult>;
  abstract findById(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract findByQuoteId(quoteId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract updateItem(
    requisitionId: string,
    itemId: string,
    data: UpdatePurchaseRequisitionItemData,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null>;
  abstract linkItemToErp(
    requisitionId: string,
    itemId: string,
    data: LinkPurchaseRequisitionItemToErpData,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null>;
  abstract submit(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract assign(id: string, buyerUserId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract createOffer(
    requisitionId: string,
    data: SavePurchaseSupplierOfferData,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null>;
  abstract selectOffer(
    requisitionId: string,
    itemId: string,
    offerId: string,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null>;
  abstract approveCostVariance(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract isReadyForOrder(quoteId: string): Promise<boolean>;
  abstract markCompletedByQuoteId(quoteId: string): Promise<void>;
  abstract listSuppliers(search: string | undefined, includeInactive: boolean): Promise<SupplierEntity[]>;
  abstract createSupplier(data: SaveSupplierData): Promise<SupplierEntity>;
  abstract updateSupplier(id: string, data: SaveSupplierData): Promise<SupplierEntity | null>;
}
