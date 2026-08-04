import type { WarehouseAccessMode } from "../../infrastructure/database/generated/enums";
import type { ErpProductsSearchPort, ErpWarehouseProduct } from "../contracts/erp-products-search.port";
import type { UpsertErpWarehouseRequestDto } from "../dtos/request/upsert-erp-warehouse-request.dto";
import type {
  BranchWarehouseAccessEntity,
  EffectiveWarehouseAccessEntity,
  ErpWarehouseEntity,
  UserWarehouseAccessEntity,
} from "../entities/erp-warehouse.entity";
import type { ErpWarehouseRepository } from "../repositories/erp-warehouse.repository";

export class ErpWarehouseAccessUseCase {
  constructor(
    private readonly repository: ErpWarehouseRepository,
    private readonly productSearch: ErpProductsSearchPort,
  ) {}

  listWarehouses(includeInactive: boolean): Promise<ErpWarehouseEntity[]> {
    return this.repository.list(includeInactive);
  }

  async createWarehouse(dto: UpsertErpWarehouseRequestDto): Promise<ErpWarehouseEntity> {
    const code = dto.code!;
    if (await this.repository.existsByCode(code)) throw new Error("ERP warehouse code already exists.");
    return this.repository.create({ code, name: dto.name, companyCode: dto.companyCode });
  }

  async updateWarehouse(id: string, dto: UpsertErpWarehouseRequestDto): Promise<ErpWarehouseEntity> {
    const current = await this.repository.findById(id);
    if (!current) throw new Error("ERP warehouse not found.");
    if (dto.code && dto.code !== current.code) throw new Error("ERP warehouse code cannot be changed.");
    const isActive = dto.isActive ?? current.isActive;
    if (current.isActive && !isActive && await this.repository.hasAssignments(id)) {
      throw new Error("Cannot deactivate an ERP warehouse while it is assigned.");
    }
    const updated = await this.repository.updateById(id, {
      name: dto.name,
      companyCode: dto.companyCode,
      isActive,
    });
    if (!updated) throw new Error("ERP warehouse not found.");
    return updated;
  }

  async getBranchAccess(branchId: string): Promise<BranchWarehouseAccessEntity> {
    const access = await this.repository.getBranchAccess(branchId);
    if (!access) throw new Error("Branch not found.");
    return access;
  }

  async replaceBranchAccess(
    branchId: string,
    warehouseCodes: string[],
    actorUserId: string,
  ): Promise<BranchWarehouseAccessEntity> {
    if (warehouseCodes.length === 0) throw new Error("At least one ERP warehouse is required for a branch.");
    const branch = await this.repository.getBranchAccess(branchId);
    if (!branch) throw new Error("Branch not found.");
    if (!branch.branch.isActive) throw new Error("Cannot configure an inactive branch.");

    const warehouses = await this.resolveActiveWarehouses(warehouseCodes);
    await this.repository.replaceBranchWarehouses(branchId, warehouses.map((warehouse) => warehouse.id), actorUserId);
    return this.getBranchAccess(branchId);
  }

  async getUserAccess(userId: string): Promise<EffectiveWarehouseAccessEntity> {
    const access = await this.repository.getUserAccess(userId);
    if (!access) throw new Error("User not found.");
    return this.withEffectiveWarehouses(access);
  }

  async replaceUserAccess(
    userId: string,
    accessMode: WarehouseAccessMode,
    warehouseCodes: string[],
    actorUserId: string,
  ): Promise<EffectiveWarehouseAccessEntity> {
    const userAccess = await this.repository.getUserAccess(userId);
    if (!userAccess) throw new Error("User not found.");
    if (userAccess.user.role !== "SELLER") throw new Error("ERP warehouses can only be assigned directly to sellers.");
    if (!userAccess.user.isActive) throw new Error("Cannot configure an inactive user.");
    if (accessMode === "INHERIT" && warehouseCodes.length > 0) {
      throw new Error("INHERIT mode cannot contain individual ERP warehouses.");
    }
    if (accessMode !== "INHERIT" && warehouseCodes.length === 0) {
      throw new Error(`${accessMode} mode requires at least one individual ERP warehouse.`);
    }

    const warehouses = await this.resolveActiveWarehouses(warehouseCodes);
    await this.repository.replaceUserWarehouses(
      userId,
      accessMode,
      warehouses.map((warehouse) => warehouse.id),
      actorUserId,
    );
    return this.getUserAccess(userId);
  }

  async searchProducts(userId: string, term: string): Promise<{
    access: EffectiveWarehouseAccessEntity;
    warehouseCodes: string[];
    authorizedWarehouseCodes: string[];
    items: Array<ErpWarehouseProduct & { authorized: boolean }>;
  }> {
    const access = await this.getUserAccess(userId);
    if (access.user.role !== "SELLER") throw new Error("Only sellers can search ERP products for quotations.");
    if (access.effectiveWarehouses.length === 0) throw new Error("The user has no ERP warehouses assigned.");
    const warehouses = await this.repository.list(false);
    const warehouseCodes = warehouses.map((warehouse) => warehouse.code);
    const authorizedWarehouseCodes = access.effectiveWarehouses.map((warehouse) => warehouse.code);
    const authorized = new Set(authorizedWarehouseCodes);
    const [authorizedItems, allItems] = await Promise.all([
      this.productSearch.search(term, authorizedWarehouseCodes),
      this.productSearch.search(term, warehouseCodes),
    ]);
    const unique = new Map<string, ErpWarehouseProduct>();
    [...authorizedItems, ...allItems].forEach((item) => {
      const key = `${item.warehouseId}::${item.code}::${item.ean}`;
      if (!unique.has(key)) unique.set(key, item);
    });
    const items = [...unique.values()]
      .map((item) => ({ ...item, authorized: authorized.has(item.warehouseId) }))
      .sort((left, right) => Number(right.authorized) - Number(left.authorized));
    return { access, warehouseCodes, authorizedWarehouseCodes, items };
  }

  private async resolveActiveWarehouses(codes: string[]): Promise<ErpWarehouseEntity[]> {
    if (codes.length === 0) return [];
    const warehouses = await this.repository.findActiveByCodes(codes);
    const foundCodes = new Set(warehouses.map((warehouse) => warehouse.code));
    const missingCodes = codes.filter((code) => !foundCodes.has(code));
    if (missingCodes.length > 0) {
      throw new Error(`ERP warehouses not found or inactive: ${missingCodes.join(", ")}.`);
    }
    return warehouses;
  }

  private withEffectiveWarehouses(access: UserWarehouseAccessEntity): EffectiveWarehouseAccessEntity {
    const selected = access.accessMode === "INHERIT"
      ? access.branchWarehouses
      : access.accessMode === "OVERRIDE"
        ? access.userWarehouses
        : [...access.branchWarehouses, ...access.userWarehouses];
    const unique = new Map(selected.map((warehouse) => [warehouse.code, warehouse]));
    return {
      ...access,
      effectiveWarehouses: [...unique.values()].sort((left, right) => left.code.localeCompare(right.code)),
    };
  }
}
