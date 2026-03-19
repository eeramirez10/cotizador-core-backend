import {
  BranchDatasource,
  CreateBranchDatasourceParams,
  UpdateBranchDatasourceParams,
} from "../../domain/datasources/branch.datasource";
import { BranchEntity } from "../../domain/entities/branch.entity";
import { prisma } from "../database/prisma-client";
import { BranchMapper } from "../mappers/branch.mapper";

export class PrismaBranchDatasource implements BranchDatasource {
  async findAllActive(): Promise<BranchEntity[]> {
    const rows = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    return rows.map((row) => BranchMapper.toEntity(row));
  }

  async findById(id: string): Promise<BranchEntity | null> {
    const row = await prisma.branch.findFirst({
      where: { id: id.trim() },
    });

    if (!row) return null;
    return BranchMapper.toEntity(row);
  }

  async findActiveByCode(code: string): Promise<BranchEntity | null> {
    const row = await prisma.branch.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        isActive: true,
      },
    });

    if (!row) return null;
    return BranchMapper.toEntity(row);
  }

  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return false;

    const row = await prisma.branch.findFirst({
      where: {
        code: normalizedCode,
        ...(excludeId ? { id: { not: excludeId.trim() } } : {}),
      },
      select: { id: true },
    });

    return Boolean(row);
  }

  async create(params: CreateBranchDatasourceParams): Promise<BranchEntity> {
    const row = await prisma.branch.create({
      data: {
        code: params.code.trim().toUpperCase(),
        name: params.name.trim(),
        address: params.address,
      },
    });

    return BranchMapper.toEntity(row);
  }

  async updateById(id: string, data: UpdateBranchDatasourceParams): Promise<BranchEntity | null> {
    const updated = await prisma.branch.updateMany({
      where: {
        id: id.trim(),
        isActive: true,
      },
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        address: data.address,
      },
    });

    if (updated.count === 0) return null;
    return this.findById(id);
  }

  async softDeactivateById(id: string): Promise<boolean> {
    const updated = await prisma.branch.updateMany({
      where: {
        id: id.trim(),
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return updated.count > 0;
  }

  async hasActiveUsers(branchId: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: {
        branchId: branchId.trim(),
        isActive: true,
      },
    });

    return count > 0;
  }
}
