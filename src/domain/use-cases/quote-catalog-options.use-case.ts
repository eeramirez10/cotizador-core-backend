import { QuoteCatalogActorScope } from "../datasources/quote-catalog.datasource";
import { UpsertQuoteCatalogOptionRequestDto } from "../dtos/request/upsert-quote-catalog-option-request.dto";
import { QuoteCatalogOptionResponseDto } from "../dtos/response/quote-catalog-option-response.dto";
import { QuoteCatalogRepository } from "../repositories/quote-catalog.repository";
import { QuoteCatalogType } from "../../infrastructure/database/generated/enums";

export class QuoteCatalogOptionsUseCase {
  constructor(private readonly repository: QuoteCatalogRepository) {}

  async listAvailable(actor: QuoteCatalogActorScope, type?: QuoteCatalogType): Promise<QuoteCatalogOptionResponseDto[]> {
    const options = await this.repository.listAvailable(actor.branchId, type);
    return options.map((option) => new QuoteCatalogOptionResponseDto(option));
  }

  async listManaged(actor: QuoteCatalogActorScope): Promise<QuoteCatalogOptionResponseDto[]> {
    const options = await this.repository.listManaged(actor);
    return options.map((option) => new QuoteCatalogOptionResponseDto(option));
  }

  async create(dto: UpsertQuoteCatalogOptionRequestDto, actor: QuoteCatalogActorScope): Promise<QuoteCatalogOptionResponseDto> {
    const branchId = actor.role === "MANAGER" ? actor.branchId : dto.branchId;
    if (await this.repository.existsInScope(dto.type, dto.code, branchId)) throw new Error("Catalog option code already exists in this scope.");
    const option = await this.repository.create({
      type: dto.type,
      code: dto.code,
      label: dto.label,
      value: dto.value,
      numericValue: dto.numericValue,
      requiresComment: dto.requiresComment,
      sortOrder: dto.sortOrder,
      branchId,
    });
    return new QuoteCatalogOptionResponseDto(option);
  }

  async update(id: string, dto: UpsertQuoteCatalogOptionRequestDto, actor: QuoteCatalogActorScope): Promise<QuoteCatalogOptionResponseDto> {
    const current = await this.repository.findById(id);
    if (!current) throw new Error("Catalog option not found.");
    if (actor.role === "MANAGER" && current.branchId !== actor.branchId) throw new Error("You can only manage catalog options from your branch.");
    if (current.type !== dto.type || current.code !== dto.code) throw new Error("Catalog option type and code cannot be changed.");
    const option = await this.repository.updateById(id, {
      label: dto.label,
      value: dto.value,
      numericValue: dto.numericValue,
      requiresComment: dto.requiresComment,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });
    if (!option) throw new Error("Catalog option not found.");
    return new QuoteCatalogOptionResponseDto(option);
  }

  async deactivate(id: string, actor: QuoteCatalogActorScope): Promise<void> {
    const current = await this.repository.findById(id);
    if (!current) throw new Error("Catalog option not found.");
    if (actor.role === "MANAGER" && current.branchId !== actor.branchId) throw new Error("You can only manage catalog options from your branch.");
    const option = await this.repository.updateById(id, {
      label: current.label,
      value: current.value,
      numericValue: current.numericValue,
      requiresComment: current.requiresComment,
      sortOrder: current.sortOrder,
      isActive: false,
    });
    if (!option) throw new Error("Catalog option not found.");
  }
}
