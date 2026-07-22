import type {
  ProductProcurementStatus,
  UserRole,
} from "../../infrastructure/database/generated/enums";
import { ChangeProcurementStatusRequestDto } from "../dtos/request/change-procurement-status-request.dto";
import { GetLocalProductProcurementQueryDto } from "../dtos/request/get-local-product-procurement-query.dto";
import { UpsertProcurementOfferRequestDto } from "../dtos/request/upsert-procurement-offer-request.dto";
import {
  LocalProductProcurementResponseDto,
  PaginatedLocalProductProcurementResponseDto,
} from "../dtos/response/local-product-procurement-response.dto";
import { LocalProductProcurementRepository } from "../repositories/local-product-procurement.repository";

interface ProcurementActor {
  id: string;
  role: UserRole;
  branchId: string;
}

const allowedTransitions: Record<ProductProcurementStatus, ProductProcurementStatus[]> = {
  PENDING_REVIEW: ["QUOTING", "REJECTED"],
  QUOTING: ["PENDING_REVIEW", "REJECTED"],
  COSTED: ["QUOTING", "PENDING_ERP", "REJECTED"],
  PENDING_ERP: ["QUOTING"],
  ERP_LINKED: [],
  REJECTED: ["PENDING_REVIEW", "QUOTING"],
};

export class LocalProductProcurementUseCase {
  constructor(private readonly repository: LocalProductProcurementRepository) {}

  async list(dto: GetLocalProductProcurementQueryDto, actor: ProcurementActor) {
    const result = await this.repository.findPaginated({
      page: dto.page,
      pageSize: dto.pageSize,
      search: dto.search,
      status: dto.status,
      scope: actor,
    });
    return new PaginatedLocalProductProcurementResponseDto(
      result.items,
      result.total,
      dto.page,
      dto.pageSize,
    );
  }

  async get(productId: string, actor: ProcurementActor) {
    const product = await this.repository.findById(productId, actor);
    if (!product) throw new Error("Local product not found.");
    return new LocalProductProcurementResponseDto(product);
  }

  async createOffer(
    productId: string,
    dto: UpsertProcurementOfferRequestDto,
    actor: ProcurementActor,
  ) {
    const product = await this.repository.findById(productId, actor);
    if (!product) throw new Error("Local product not found.");
    if (product.procurementStatus === "ERP_LINKED") {
      throw new Error("ERP linked products cannot receive new supplier offers.");
    }

    const offer = await this.repository.createOffer({
      ...this.offerData(dto),
      productId,
      actorUserId: actor.id,
      scope: actor,
    });
    if (!offer) throw new Error("Local product not found.");
    return this.get(productId, actor);
  }

  async updateOffer(
    productId: string,
    offerId: string,
    dto: UpsertProcurementOfferRequestDto,
    actor: ProcurementActor,
  ) {
    const offer = await this.repository.updateOffer({
      ...this.offerData(dto),
      productId,
      offerId,
      actorUserId: actor.id,
      scope: actor,
    });
    if (!offer) throw new Error("Supplier offer not found.");
    return this.get(productId, actor);
  }

  async deactivateOffer(offerId: string, actor: ProcurementActor): Promise<void> {
    const deleted = await this.repository.deactivateOffer(offerId, actor.id, actor);
    if (!deleted) {
      throw new Error("Supplier offer not found or selected offers cannot be removed.");
    }
  }

  async selectOffer(productId: string, offerId: string, actor: ProcurementActor) {
    const product = await this.repository.selectOffer(productId, offerId, actor.id, actor);
    if (!product) throw new Error("Supplier offer not found.");
    return new LocalProductProcurementResponseDto(product);
  }

  async changeStatus(
    productId: string,
    dto: ChangeProcurementStatusRequestDto,
    actor: ProcurementActor,
  ) {
    const current = await this.repository.findById(productId, actor);
    if (!current) throw new Error("Local product not found.");
    if (dto.status === "COSTED") {
      throw new Error("Select a supplier offer to mark the product as costed.");
    }
    if (dto.status === "ERP_LINKED") {
      throw new Error("ERP linkage will be completed from the ERP onboarding workflow.");
    }
    if (!allowedTransitions[current.procurementStatus].includes(dto.status)) {
      throw new Error(`Invalid procurement transition from ${current.procurementStatus} to ${dto.status}.`);
    }
    if (dto.status === "REJECTED" && !dto.comment) {
      throw new Error("A rejection comment is required.");
    }

    const updated = await this.repository.updateStatus(
      productId,
      dto.status,
      dto.comment,
      actor.id,
      actor,
    );
    if (!updated) throw new Error("Local product not found.");
    return new LocalProductProcurementResponseDto(updated);
  }

  private offerData(dto: UpsertProcurementOfferRequestDto) {
    return {
      supplierName: dto.supplierName,
      contactName: dto.contactName,
      email: dto.email,
      phone: dto.phone,
      unitCost: dto.unitCost,
      currency: dto.currency,
      minimumQty: dto.minimumQty,
      deliveryTime: dto.deliveryTime,
      validUntil: dto.validUntil,
      notes: dto.notes,
    };
  }
}
