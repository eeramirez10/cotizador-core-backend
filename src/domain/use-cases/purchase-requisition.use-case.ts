import { LocalProductSemanticPort } from "../contracts/local-product-semantic.port";
import { ErpProductLookupPort } from "../contracts/erp-product-lookup.port";
import type { PurchaseRequisitionActor } from "../datasources/purchase-requisition.datasource";
import {
  AssignPurchaseRequisitionRequestDto,
  CreatePurchaseSupplierOfferRequestDto,
  GetPurchaseRequisitionsQueryDto,
  SaveSupplierRequestDto,
  LinkPurchaseRequisitionItemToErpRequestDto,
  UpdatePurchaseRequisitionItemRequestDto,
} from "../dtos/request/purchase-requisition-request.dto";
import { PurchaseRequisitionResponseDto, SupplierResponseDto } from "../dtos/response/purchase-requisition-response.dto";
import type { QuoteEntity } from "../entities/quote.entity";
import { PurchaseRequisitionRepository } from "../repositories/purchase-requisition.repository";
import { QuoteRepository } from "../repositories/quote.repository";
import { canonicalizeProductText, normalizeProductDisplayText } from "../utils/canonical-product-text";

export class PurchaseRequisitionUseCase {
  constructor(
    private readonly repository: PurchaseRequisitionRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly semanticPort: LocalProductSemanticPort,
    private readonly erpProductLookup: ErpProductLookupPort,
  ) {}

  async ensureAfterApproval(quote: QuoteEntity) {
    const requisition = await this.repository.ensureForApprovedQuote(quote);
    return requisition ? new PurchaseRequisitionResponseDto(requisition) : null;
  }

  async createFromApprovedQuote(quoteId: string, actor: PurchaseRequisitionActor) {
    const quote = await this.quoteRepository.findById({
      id: quoteId,
      scope: { role: actor.role, userId: actor.id, branchId: actor.branchId },
    });
    if (!quote) throw new Error("Quote not found.");
    if (quote.status !== "APPROVED") throw new Error("Quote must be APPROVED before creating a purchase requisition.");
    return this.ensureAfterApproval(quote);
  }

  async list(dto: GetPurchaseRequisitionsQueryDto, actor: PurchaseRequisitionActor) {
    const result = await this.repository.findPaginated({
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
      status: dto.status,
      actor,
    });
    return {
      items: result.items.map((item) => new PurchaseRequisitionResponseDto(item).toJSON()),
      total: result.total,
      page: dto.page,
      pageSize: dto.pageSize,
      totalPages: Math.max(1, Math.ceil(result.total / dto.pageSize)),
    };
  }

  async get(id: string, actor: PurchaseRequisitionActor) {
    const requisition = await this.repository.findById(id, actor);
    if (!requisition) throw new Error("Purchase requisition not found.");
    return new PurchaseRequisitionResponseDto(requisition);
  }

  async getByQuoteId(quoteId: string, actor: PurchaseRequisitionActor) {
    const requisition = await this.repository.findByQuoteId(quoteId, actor);
    return requisition ? new PurchaseRequisitionResponseDto(requisition) : null;
  }

  async updateItem(
    id: string,
    itemId: string,
    dto: UpdatePurchaseRequisitionItemRequestDto,
    actor: PurchaseRequisitionActor,
  ) {
    const updated = await this.repository.updateItem(id, itemId, dto.data, actor);
    if (!updated) throw new Error("Purchase requisition item not found.");
    return new PurchaseRequisitionResponseDto(updated);
  }

  async linkItemToErp(
    id: string,
    itemId: string,
    dto: LinkPurchaseRequisitionItemToErpRequestDto,
    actor: PurchaseRequisitionActor,
  ) {
    const erpProduct = await this.erpProductLookup.findByCodeInMexico(dto.erpCode);
    if (!erpProduct) throw new Error("ERP product was not found in Mexico branch.");
    if (erpProduct.ean.trim().toUpperCase() !== dto.erpEan.trim().toUpperCase()) {
      throw new Error("ERP product EAN changed. Search and select the product again.");
    }

    const updated = await this.repository.linkItemToErp(id, itemId, {
      erpCode: erpProduct.code,
      erpEan: erpProduct.ean,
      actorUserId: actor.id,
    }, actor);
    if (!updated) throw new Error("Purchase requisition item not found.");

    const productId = updated.items.find((item) => item.id === itemId)?.productId;
    if (productId) {
      await this.semanticPort.remove(productId).catch((cause) => {
        console.error("Unable to remove ERP-linked product from semantic index.", { productId, cause });
      });
    }
    return new PurchaseRequisitionResponseDto(updated);
  }

  async submit(id: string, actor: PurchaseRequisitionActor) {
    const updated = await this.repository.submit(id, actor);
    if (!updated) throw new Error("Purchase requisition not found.");
    return new PurchaseRequisitionResponseDto(updated);
  }

  async assign(id: string, dto: AssignPurchaseRequisitionRequestDto, actor: PurchaseRequisitionActor) {
    const updated = await this.repository.assign(id, dto.buyerUserId, actor);
    if (!updated) throw new Error("Purchase requisition not found.");
    return new PurchaseRequisitionResponseDto(updated);
  }

  async createOffer(
    id: string,
    itemId: string,
    dto: CreatePurchaseSupplierOfferRequestDto,
    actor: PurchaseRequisitionActor,
  ) {
    const updated = await this.repository.createOffer(id, {
      requisitionItemId: itemId,
      supplierId: dto.supplierId,
      qty: dto.qty,
      unitCost: dto.unitCost,
      currency: dto.currency,
      exchangeRate: dto.exchangeRate,
      taxRate: dto.taxRate,
      brand: dto.brand,
      origin: dto.origin,
      deliveryTime: dto.deliveryTime,
      validUntil: dto.validUntil,
      quoteDate: dto.quoteDate,
      externalReference: dto.externalReference,
      notes: dto.notes,
      actorUserId: actor.id,
    }, actor);
    if (!updated) throw new Error("Purchase requisition item not found.");
    return new PurchaseRequisitionResponseDto(updated);
  }

  async selectOffer(id: string, itemId: string, offerId: string, actor: PurchaseRequisitionActor) {
    const updated = await this.repository.selectOffer(id, itemId, offerId, actor);
    if (!updated) throw new Error("Supplier offer not found.");
    return new PurchaseRequisitionResponseDto(updated);
  }

  async approveCostVariance(id: string, actor: PurchaseRequisitionActor) {
    const updated = await this.repository.approveCostVariance(id, actor);
    if (!updated) throw new Error("Purchase requisition not found.");
    return new PurchaseRequisitionResponseDto(updated);
  }

  async listSuppliers(search: string | undefined, includeInactive: boolean) {
    const suppliers = await this.repository.listSuppliers(search, includeInactive);
    return suppliers.map(SupplierResponseDto.toJSON);
  }

  async createSupplier(dto: SaveSupplierRequestDto, actor: PurchaseRequisitionActor) {
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can create suppliers.");
    const supplier = await this.repository.createSupplier({
      erpCode: dto.erpCode,
      name: normalizeProductDisplayText(dto.name),
      canonicalName: canonicalizeProductText(dto.name),
      scope: dto.scope,
      country: dto.country,
      contactName: dto.contactName,
      email: dto.email,
      phone: dto.phone,
      actorUserId: actor.id,
    });
    return SupplierResponseDto.toJSON(supplier);
  }

  async updateSupplier(id: string, dto: SaveSupplierRequestDto, actor: PurchaseRequisitionActor) {
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can update suppliers.");
    const supplier = await this.repository.updateSupplier(id, {
      erpCode: dto.erpCode,
      name: normalizeProductDisplayText(dto.name),
      canonicalName: canonicalizeProductText(dto.name),
      scope: dto.scope,
      country: dto.country,
      contactName: dto.contactName,
      email: dto.email,
      phone: dto.phone,
      actorUserId: actor.id,
    });
    if (!supplier) throw new Error("Supplier not found.");
    return SupplierResponseDto.toJSON(supplier);
  }
}
