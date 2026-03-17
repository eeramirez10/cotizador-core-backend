import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateLocalTempProductRequestDto } from "../dtos/request/create-local-temp-product-request.dto";
import { ProductResponseDto } from "../dtos/response/product-response.dto";
import { BranchRepository } from "../repositories/branch.repository";
import { ProductRepository } from "../repositories/product.repository";

interface CreateLocalTempProductActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const normalizeText = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ");

export class CreateLocalTempProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly branchRepository: BranchRepository
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

    const product = await this.productRepository.createLocalTemp({
      description: normalizeText(dto.description),
      unit: normalizeText(dto.unit).toUpperCase(),
      currency: dto.currency,
      averageCost: dto.averageCost,
      lastCost: dto.lastCost,
      stock: dto.stock,
      ean: dto.ean,
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
      branchId: targetBranchId,
    });

    return new ProductResponseDto(product);
  }
}
