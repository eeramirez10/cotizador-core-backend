import { LocalProductSemanticPort } from "../contracts/local-product-semantic.port";
import { ErpProductLookupPort } from "../contracts/erp-product-lookup.port";
import { ErpSupplierLookupPort } from "../contracts/erp-supplier-lookup.port";
import type { PurchaseRequisitionActor } from "../datasources/purchase-requisition.datasource";
import {
  AssignPurchaseRequisitionRequestDto,
  CreatePurchaseSupplierOfferRequestDto,
  GetPurchaseRequisitionsQueryDto,
  SaveSupplierRequestDto,
  SyncErpSupplierRequestDto,
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
    private readonly erpSupplierLookup: ErpSupplierLookupPort,
  ) {}

  async ensureAfterApproval(quote: QuoteEntity) {
    if (quote.captureMethod === "EXCEL_IMPORT") return null;
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
    if (quote.captureMethod === "EXCEL_IMPORT") {
      throw new Error("Purchase requisitions cannot be created from Excel-imported quotes.");
    }
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

  async searchErpSuppliers(term: string, actor: PurchaseRequisitionActor) {
    if (!["ADMIN", "SELLER", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN, SELLER or PURCHASING can search ERP suppliers.");
    const normalized = term.trim();
    if (!normalized) throw new Error("Supplier search term is required.");
    return this.erpSupplierLookup.search(normalized, 20);
  }

  async syncErpSupplier(dto: SyncErpSupplierRequestDto, actor: PurchaseRequisitionActor) {
    if (!["ADMIN", "SELLER", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN, SELLER or PURCHASING can sync ERP suppliers.");
    const erpSupplier = await this.erpSupplierLookup.findByCode(dto.erpCode);
    if (!erpSupplier) throw new Error("ERP supplier not found.");
    const contact = erpSupplier.contacts.find((item) => item.email || item.mobile || item.phone)
      ?? erpSupplier.contacts[0]
      ?? null;
    const supplier = await this.repository.upsertErpSupplier({
      erpCode: erpSupplier.code,
      name: normalizeProductDisplayText(erpSupplier.name),
      canonicalName: canonicalizeProductText(erpSupplier.name),
      taxId: erpSupplier.taxId || null,
      state: erpSupplier.state || null,
      creditTerms: erpSupplier.creditTerms || null,
      currency: erpSupplier.currency,
      contactName: contact?.name || null,
      contactPosition: contact?.position || null,
      email: contact?.email || null,
      phone: contact?.phone || null,
      phoneExtension: contact?.extension || null,
      mobile: contact?.mobile || null,
      notes: contact?.notes || null,
      actorUserId: actor.id,
    });
    return SupplierResponseDto.toJSON(supplier);
  }

  async createSupplier(dto: SaveSupplierRequestDto, actor: PurchaseRequisitionActor) {
    if (!["ADMIN", "SELLER", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN, SELLER or PURCHASING can create suppliers.");
    const supplier = await this.repository.createSupplier({
      name: normalizeProductDisplayText(dto.name),
      canonicalName: canonicalizeProductText(dto.name),
      scope: dto.scope,
      taxId: dto.taxId,
      state: dto.state,
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
      name: normalizeProductDisplayText(dto.name),
      canonicalName: canonicalizeProductText(dto.name),
      scope: dto.scope,
      taxId: dto.taxId,
      state: dto.state,
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
