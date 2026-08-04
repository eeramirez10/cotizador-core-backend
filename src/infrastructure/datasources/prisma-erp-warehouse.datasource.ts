import type { WarehouseAccessMode } from "../database/generated/enums";
import type {
  CreateErpWarehouseDatasourceParams,
  UpdateErpWarehouseDatasourceParams,
} from "../../domain/datasources/erp-warehouse.datasource";
import { ErpWarehouseDatasource } from "../../domain/datasources/erp-warehouse.datasource";
import type {
  BranchWarehouseAccessEntity,
  ErpWarehouseEntity,
  UserWarehouseAccessEntity,
} from "../../domain/entities/erp-warehouse.entity";
import { prisma } from "../database/prisma-client";

const toWarehouseEntity = (row: {
  id: string;
  code: string;
  name: string;
  companyCode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ErpWarehouseEntity => ({ ...row });

export class PrismaErpWarehouseDatasource implements ErpWarehouseDatasource {
  async list(includeInactive: boolean): Promise<ErpWarehouseEntity[]> {
    const rows = await prisma.erpWarehouse.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ code: "asc" }],
    });
    return rows.map(toWarehouseEntity);
  }

  async findById(id: string): Promise<ErpWarehouseEntity | null> {
    const row = await prisma.erpWarehouse.findUnique({ where: { id: id.trim() } });
    return row ? toWarehouseEntity(row) : null;
  }

  async findActiveByCodes(codes: string[]): Promise<ErpWarehouseEntity[]> {
    if (codes.length === 0) return [];
    const rows = await prisma.erpWarehouse.findMany({
      where: { code: { in: codes }, isActive: true },
      orderBy: { code: "asc" },
    });
    return rows.map(toWarehouseEntity);
  }

  async existsByCode(code: string): Promise<boolean> {
    const count = await prisma.erpWarehouse.count({ where: { code: code.trim() } });
    return count > 0;
  }

  async hasAssignments(id: string): Promise<boolean> {
    const [branchAssignments, userAssignments] = await prisma.$transaction([
      prisma.branchErpWarehouse.count({ where: { warehouseId: id.trim() } }),
      prisma.userErpWarehouse.count({ where: { warehouseId: id.trim() } }),
    ]);
    return branchAssignments + userAssignments > 0;
  }

  async create(params: CreateErpWarehouseDatasourceParams): Promise<ErpWarehouseEntity> {
    const row = await prisma.erpWarehouse.create({ data: params });
    return toWarehouseEntity(row);
  }

  async updateById(id: string, params: UpdateErpWarehouseDatasourceParams): Promise<ErpWarehouseEntity | null> {
    const updated = await prisma.erpWarehouse.updateMany({ where: { id: id.trim() }, data: params });
    return updated.count > 0 ? this.findById(id) : null;
  }

  async getBranchAccess(branchId: string): Promise<BranchWarehouseAccessEntity | null> {
    const row = await prisma.branch.findUnique({
      where: { id: branchId.trim() },
      include: {
        erpWarehouseAssignments: {
          where: { warehouse: { isActive: true } },
          include: { warehouse: true },
          orderBy: { warehouse: { code: "asc" } },
        },
      },
    });
    if (!row) return null;
    return {
      branch: { id: row.id, code: row.code, name: row.name, isActive: row.isActive },
      warehouses: row.erpWarehouseAssignments.map((assignment) => toWarehouseEntity(assignment.warehouse)),
    };
  }

  async replaceBranchWarehouses(branchId: string, warehouseIds: string[], actorUserId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.branchErpWarehouse.deleteMany({ where: { branchId } });
      if (warehouseIds.length > 0) {
        await tx.branchErpWarehouse.createMany({
          data: warehouseIds.map((warehouseId) => ({ branchId, warehouseId, assignedByUserId: actorUserId })),
        });
      }
    });
  }

  async getUserAccess(userId: string): Promise<UserWarehouseAccessEntity | null> {
    const row = await prisma.user.findUnique({
      where: { id: userId.trim() },
      include: {
        branch: {
          include: {
            erpWarehouseAssignments: {
              where: { warehouse: { isActive: true } },
              include: { warehouse: true },
              orderBy: { warehouse: { code: "asc" } },
            },
          },
        },
        erpWarehouseAssignments: {
          where: { warehouse: { isActive: true } },
          include: { warehouse: true },
          orderBy: { warehouse: { code: "asc" } },
        },
      },
    });
    if (!row) return null;
    return {
      user: {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
        isActive: row.isActive,
      },
      branch: { id: row.branch.id, code: row.branch.code, name: row.branch.name },
      accessMode: row.warehouseAccessMode,
      branchWarehouses: row.branch.erpWarehouseAssignments.map((assignment) => toWarehouseEntity(assignment.warehouse)),
      userWarehouses: row.erpWarehouseAssignments.map((assignment) => toWarehouseEntity(assignment.warehouse)),
    };
  }

  async replaceUserWarehouses(
    userId: string,
    accessMode: WarehouseAccessMode,
    warehouseIds: string[],
    actorUserId: string,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { warehouseAccessMode: accessMode } });
      await tx.userErpWarehouse.deleteMany({ where: { userId } });
      if (warehouseIds.length > 0) {
        await tx.userErpWarehouse.createMany({
          data: warehouseIds.map((warehouseId) => ({ userId, warehouseId, assignedByUserId: actorUserId })),
        });
      }
    });
  }
}
