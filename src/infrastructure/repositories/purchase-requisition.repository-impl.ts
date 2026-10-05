import type {
  FindPurchaseRequisitionsParams,
  LinkPurchaseRequisitionItemToErpData,
  PurchaseRequisitionActor,
  SavePurchaseSupplierOfferData,
  SaveErpSupplierData,
  SaveSupplierData,
  SupplierOfferAllocation,
  UpdatePurchaseRequisitionItemData,
  UpdatePurchaseRequisitionDocumentData,
} from "../../domain/datasources/purchase-requisition.datasource";
import { PurchaseRequisitionDatasource } from "../../domain/datasources/purchase-requisition.datasource";
import type { QuoteEntity } from "../../domain/entities/quote.entity";
import { PurchaseRequisitionRepository } from "../../domain/repositories/purchase-requisition.repository";

export class PurchaseRequisitionRepositoryImpl extends PurchaseRequisitionRepository {
  constructor(private readonly datasource: PurchaseRequisitionDatasource) { super(); }

  ensureForApprovedQuote(quote: QuoteEntity) { return this.datasource.ensureForApprovedQuote(quote); }
  findPaginated(params: FindPurchaseRequisitionsParams) { return this.datasource.findPaginated(params); }
  findById(id: string, actor: PurchaseRequisitionActor) { return this.datasource.findById(id, actor); }
  findByQuoteId(quoteId: string, actor: PurchaseRequisitionActor) { return this.datasource.findByQuoteId(quoteId, actor); }
  updateDocument(id: string, data: UpdatePurchaseRequisitionDocumentData, actor: PurchaseRequisitionActor) { return this.datasource.updateDocument(id, data, actor); }
  updateSupplierCode(id: string, itemId: string, offerId: string, supplierProductCode: string | null, actor: PurchaseRequisitionActor) { return this.datasource.updateSupplierCode(id, itemId, offerId, supplierProductCode, actor); }
  updateItem(id: string, itemId: string, data: UpdatePurchaseRequisitionItemData, actor: PurchaseRequisitionActor) { return this.datasource.updateItem(id, itemId, data, actor); }
  linkItemToErp(id: string, itemId: string, data: LinkPurchaseRequisitionItemToErpData, actor: PurchaseRequisitionActor) { return this.datasource.linkItemToErp(id, itemId, data, actor); }
  submit(id: string, actor: PurchaseRequisitionActor) { return this.datasource.submit(id, actor); }
  assign(id: string, buyerUserId: string, actor: PurchaseRequisitionActor) { return this.datasource.assign(id, buyerUserId, actor); }
  createOffer(id: string, data: SavePurchaseSupplierOfferData, actor: PurchaseRequisitionActor) { return this.datasource.createOffer(id, data, actor); }
  selectOffer(id: string, itemId: string, offerId: string, actor: PurchaseRequisitionActor) { return this.datasource.selectOffer(id, itemId, offerId, actor); }
  allocateOffers(id: string, itemId: string, allocations: SupplierOfferAllocation[], actor: PurchaseRequisitionActor) { return this.datasource.allocateOffers(id, itemId, allocations, actor); }
  generateSupplierRequisitions(id: string, actor: PurchaseRequisitionActor) { return this.datasource.generateSupplierRequisitions(id, actor); }
  approveCostVariance(id: string, actor: PurchaseRequisitionActor) { return this.datasource.approveCostVariance(id, actor); }
  isReadyForOrder(quoteId: string) { return this.datasource.isReadyForOrder(quoteId); }
  markCompletedByQuoteId(quoteId: string) { return this.datasource.markCompletedByQuoteId(quoteId); }
  listSuppliers(search: string | undefined, includeInactive: boolean) { return this.datasource.listSuppliers(search, includeInactive); }
  createSupplier(data: SaveSupplierData) { return this.datasource.createSupplier(data); }
  upsertErpSupplier(data: SaveErpSupplierData) { return this.datasource.upsertErpSupplier(data); }
  updateSupplier(id: string, data: SaveSupplierData) { return this.datasource.updateSupplier(id, data); }
  setSupplierActive(id: string, isActive: boolean, actorUserId: string) { return this.datasource.setSupplierActive(id, isActive, actorUserId); }
}
