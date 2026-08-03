import type {
  FindPurchaseRequisitionsParams,
  FindPurchaseRequisitionsResult,
  LinkPurchaseRequisitionItemToErpData,
  PurchaseRequisitionActor,
  SavePurchaseSupplierOfferData,
  SaveErpSupplierData,
  SaveSupplierData,
  UpdatePurchaseRequisitionItemData,
} from "../datasources/purchase-requisition.datasource";
import type { PurchaseRequisitionEntity, SupplierEntity } from "../entities/purchase-requisition.entity";
import type { QuoteEntity } from "../entities/quote.entity";

export abstract class PurchaseRequisitionRepository {
  abstract ensureForApprovedQuote(quote: QuoteEntity): Promise<PurchaseRequisitionEntity | null>;
  abstract findPaginated(params: FindPurchaseRequisitionsParams): Promise<FindPurchaseRequisitionsResult>;
  abstract findById(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract findByQuoteId(quoteId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract updateItem(id: string, itemId: string, data: UpdatePurchaseRequisitionItemData, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract linkItemToErp(id: string, itemId: string, data: LinkPurchaseRequisitionItemToErpData, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract submit(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract assign(id: string, buyerUserId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract createOffer(id: string, data: SavePurchaseSupplierOfferData, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract selectOffer(id: string, itemId: string, offerId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract approveCostVariance(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract isReadyForOrder(quoteId: string): Promise<boolean>;
  abstract markCompletedByQuoteId(quoteId: string): Promise<void>;
  abstract listSuppliers(search: string | undefined, includeInactive: boolean): Promise<SupplierEntity[]>;
  abstract createSupplier(data: SaveSupplierData): Promise<SupplierEntity>;
  abstract upsertErpSupplier(data: SaveErpSupplierData): Promise<SupplierEntity>;
  abstract updateSupplier(id: string, data: SaveSupplierData): Promise<SupplierEntity | null>;
  abstract setSupplierActive(id: string, isActive: boolean, actorUserId: string): Promise<SupplierEntity | null>;
}
