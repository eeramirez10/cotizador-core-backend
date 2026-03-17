import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UpdateLocalTempProductRequestDto } from "../dtos/request/update-local-temp-product-request.dto";
import { ProductResponseDto } from "../dtos/response/product-response.dto";
import { ProductRepository } from "../repositories/product.repository";

interface UpdateLocalTempProductActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const normalizeText = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ");

export class UpdateLocalTempProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

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
        code: typeof dto.code === "string" ? normalizeText(dto.code).toUpperCase() : dto.code,
        ean: typeof dto.ean === "string" ? normalizeText(dto.ean).toUpperCase() : dto.ean,
        description: typeof dto.description === "string" ? normalizeText(dto.description) : undefined,
        unit: typeof dto.unit === "string" ? normalizeText(dto.unit).toUpperCase() : undefined,
        currency: dto.currency,
        averageCost: dto.averageCost,
        lastCost: dto.lastCost,
        stock: dto.stock,
        isActive: dto.isActive,
        updatedByUserId: actor.id,
      },
    });

    if (!updated) throw new Error("Local temp product not found.");
    return new ProductResponseDto(updated);
  }
}
