import type { UserRole } from "../../infrastructure/database/generated/enums";
import { LocalProductSemanticPort } from "../contracts/local-product-semantic.port";
import { CreateLocalTempProductRequestDto } from "../dtos/request/create-local-temp-product-request.dto";
import { ProductResponseDto } from "../dtos/response/product-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { ProductRepository } from "../repositories/product.repository";
import { canonicalizeProductText, normalizeProductDisplayText } from "../utils/canonical-product-text";

interface CreateLocalTempProductActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class CreateLocalTempProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly branchRepository: BranchRepository,
    private readonly semanticPort: LocalProductSemanticPort,
  ) {}

  async execute(
    dto: CreateLocalTempProductRequestDto,
    actor: CreateLocalTempProductActorContext
  ): Promise<ProductResponseDto> {
    let targetBranchId = actor.branchId;

    if (dto.branchCode) {
      if (actor.role !== "ADMIN") {
        throw new Error("branchCode is only allowed for ADMIN.");
      }

      const branch = await this.branchRepository.findActiveByCode(dto.branchCode);
      if (!branch) throw new Error("Branch not found.");
      targetBranchId = branch.id;
    }

    const description = normalizeProductDisplayText(dto.description);
    const canonicalDescription = canonicalizeProductText(dto.description);
    const unit = normalizeProductDisplayText(dto.unit);
    const hasEstimatedCost = Math.max(dto.averageCost ?? 0, dto.lastCost ?? 0) > 0;
    const existing = await this.productRepository.findActiveLocalTempByDescriptionAndUnit({ canonicalDescription, unit });
    if (existing) {
      await this.semanticPort.upsert(existing);
      return new ProductResponseDto(existing);
    }

    const product = await this.productRepository.createLocalTemp({
      description,
      canonicalDescription,
      commercialDescription: dto.commercialDescription
        ? normalizeProductDisplayText(dto.commercialDescription)
        : null,
      family: dto.family ? normalizeProductDisplayText(dto.family) : null,
      subfamily: dto.subfamily ? normalizeProductDisplayText(dto.subfamily) : null,
      brand: dto.brand ? normalizeProductDisplayText(dto.brand) : null,
      technicalAttributes: dto.technicalAttributes,
      unit,
      currency: dto.currency,
      averageCost: dto.averageCost,
      lastCost: dto.lastCost,
      stock: dto.stock,
      ean: dto.ean,
      costStatus: hasEstimatedCost ? "ESTIMATED" : "PENDING",
      costSource: hasEstimatedCost ? "MANUAL_ESTIMATE" : null,
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
      branchId: targetBranchId,
    });
    await this.semanticPort.upsert(product);

    return new ProductResponseDto(product);
  }
}
