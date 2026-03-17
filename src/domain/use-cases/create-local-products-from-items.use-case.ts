import type { UserRole } from "../../infrastructure/database/generated/enums";
import {
  DEFAULT_MEASUREMENT_UNIT,
  isAllowedMeasurementUnit,
} from "../constants/measurement-unit.constants";
import { CreateLocalProductsFromItemsRequestDto } from "../dtos/request/create-local-products-from-items-request.dto";
import { CreateLocalProductsFromItemsResponseDto } from "../dtos/response/create-local-products-from-items-response.dto";
import { ProductResponseDto } from "../dtos/response/product-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { ProductRepository } from "../repositories/product.repository";

interface CreateLocalProductsFromItemsActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const normalizeText = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ");

export class CreateLocalProductsFromItemsUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly branchRepository: BranchRepository
  ) {}

  async execute(
    dto: CreateLocalProductsFromItemsRequestDto,
    actor: CreateLocalProductsFromItemsActorContext
  ): Promise<CreateLocalProductsFromItemsResponseDto> {
    let targetBranchId = actor.branchId;

    if (dto.branchCode) {
      if (actor.role !== "ADMIN") {
        throw new Error("branchCode is only allowed for ADMIN.");
      }

      const branch = await this.branchRepository.findActiveByCode(dto.branchCode);
      if (!branch) throw new Error("Branch not found.");
      targetBranchId = branch.id;
    }

    const resultItems: Array<{
      itemId: string;
      action: "created" | "matched";
      product: ProductResponseDto;
    }> = [];

    for (const item of dto.items) {
      const normalizedDescription = normalizeText(item.description);
      const candidateUnit = normalizeText(item.unit || "").toUpperCase();
      const normalizedUnit = isAllowedMeasurementUnit(candidateUnit)
        ? candidateUnit
        : DEFAULT_MEASUREMENT_UNIT;

      const existing = await this.productRepository.findActiveLocalTempByDescriptionAndUnit({
        branchId: targetBranchId,
        description: normalizedDescription,
        unit: normalizedUnit,
      });

      if (existing) {
        resultItems.push({
          itemId: item.itemId,
          action: "matched",
          product: new ProductResponseDto(existing),
        });
        continue;
      }

      const created = await this.productRepository.createLocalTemp({
        description: normalizedDescription,
        unit: normalizedUnit,
        currency: item.currency ?? dto.defaultCurrency,
        averageCost: item.averageCost,
        lastCost: item.lastCost,
        stock: item.stock,
        ean: item.eanSuggested,
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
        branchId: targetBranchId,
      });

      resultItems.push({
        itemId: item.itemId,
        action: "created",
        product: new ProductResponseDto(created),
      });
    }

    return new CreateLocalProductsFromItemsResponseDto({
      items: resultItems,
    });
  }
}
