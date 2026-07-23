import type { UserRole } from "../../infrastructure/database/generated/enums";
import { LocalProductSemanticPort } from "../contracts/local-product-semantic.port";
import { UpdateLocalTempProductRequestDto } from "../dtos/request/update-local-temp-product-request.dto";
import { ProductResponseDto } from "../dtos/response/product-response.dto";
import { ProductRepository } from "../repositories/product.repository";
import { canonicalizeProductText, normalizeProductDisplayText } from "../utils/canonical-product-text";

interface UpdateLocalTempProductActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class UpdateLocalTempProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly semanticPort: LocalProductSemanticPort,
  ) {}

  async execute(
    productId: string,
    dto: UpdateLocalTempProductRequestDto,
    actor: UpdateLocalTempProductActorContext
  ): Promise<ProductResponseDto> {
    const updated = await this.productRepository.updateLocalTempById({
      id: productId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
      data: {
        code: typeof dto.code === "string" ? normalizeProductDisplayText(dto.code) : dto.code,
        ean: typeof dto.ean === "string" ? normalizeProductDisplayText(dto.ean) : dto.ean,
        description: typeof dto.description === "string" ? normalizeProductDisplayText(dto.description) : undefined,
        canonicalDescription: typeof dto.description === "string" ? canonicalizeProductText(dto.description) : undefined,
        unit: typeof dto.unit === "string" ? normalizeProductDisplayText(dto.unit) : undefined,
        currency: dto.currency,
        averageCost: dto.averageCost,
        lastCost: dto.lastCost,
        stock: dto.stock,
        isActive: dto.isActive,
        updatedByUserId: actor.id,
      },
    });

    if (!updated) throw new Error("Local temp product not found.");
    const sync = updated.isActive
      ? this.semanticPort.upsert(updated)
      : this.semanticPort.remove(updated.id);
    await sync;
    return new ProductResponseDto(updated);
  }
}
