import type {
  FindPurchaseRequisitionsParams,
  FindPurchaseRequisitionsResult,
  DeletedPurchaseRequisition,
  LinkPurchaseRequisitionItemToErpData,
  PurchaseRequisitionActor,
  SavePurchaseSupplierOfferData,
  SaveErpSupplierData,
  SaveSupplierData,
  SupplierOfferAllocation,
  UpdatePurchaseRequisitionItemData,
  UpdatePurchaseRequisitionDocumentData,
} from "../datasources/purchase-requisition.datasource";
import type { ProcurementUserSummary, PurchaseRequisitionEntity, SupplierEntity } from "../entities/purchase-requisition.entity";
import type { QuoteEntity } from "../entities/quote.entity";

export abstract class PurchaseRequisitionRepository {
  abstract ensureForApprovedQuote(quote: QuoteEntity): Promise<PurchaseRequisitionEntity[]>;
  abstract listBuyersForBranch(branchId: string): Promise<ProcurementUserSummary[]>;
  abstract sendUnquotedItemsToPurchasing(quote: QuoteEntity, itemIds: string[], buyerUserId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity>;
  abstract findPaginated(params: FindPurchaseRequisitionsParams): Promise<FindPurchaseRequisitionsResult>;
  abstract findById(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract listBuyers(id: string, actor: PurchaseRequisitionActor): Promise<ProcurementUserSummary[] | null>;
  abstract findByQuoteId(quoteId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity[]>;
  abstract deletePermanently(id: string, confirmation: string, actor: PurchaseRequisitionActor): Promise<DeletedPurchaseRequisition | null>;
  abstract updateDocument(id: string, data: UpdatePurchaseRequisitionDocumentData, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract updateSupplierCode(id: string, itemId: string, offerId: string, supplierProductCode: string | null, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract updateItem(id: string, itemId: string, data: UpdatePurchaseRequisitionItemData, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract linkItemToErp(id: string, itemId: string, data: LinkPurchaseRequisitionItemToErpData, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract submit(id: string, buyerUserId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract assign(id: string, buyerUserId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract createOffer(id: string, data: SavePurchaseSupplierOfferData, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract createOffersBatch(id: string, offers: SavePurchaseSupplierOfferData[], actor: PurchaseRequisitionActor): Promise<{ requisition: PurchaseRequisitionEntity; offerIds: string[] } | null>;
  abstract updateOffersBatch(id: string, supplierQuoteId: string, offers: Array<SavePurchaseSupplierOfferData & { offerId: string | null }>, actor: PurchaseRequisitionActor): Promise<{ requisition: PurchaseRequisitionEntity; offerIds: string[] } | null>;
  abstract selectOffer(id: string, itemId: string, offerId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract allocateOffers(id: string, itemId: string, allocations: SupplierOfferAllocation[], actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract finalizePricesForQuote(quoteId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity[] | null>;
  abstract generateSupplierRequisitions(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract approveCostVariance(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null>;
  abstract isReadyForOrder(quoteId: string): Promise<boolean>;
  abstract markCompletedByQuoteId(quoteId: string): Promise<void>;
  abstract listSuppliers(search: string | undefined, includeInactive: boolean): Promise<SupplierEntity[]>;
  abstract createSupplier(data: SaveSupplierData): Promise<SupplierEntity>;
  abstract upsertErpSupplier(data: SaveErpSupplierData): Promise<SupplierEntity>;
  abstract updateSupplier(id: string, data: SaveSupplierData): Promise<SupplierEntity | null>;
  abstract setSupplierActive(id: string, isActive: boolean, actorUserId: string): Promise<SupplierEntity | null>;
}
