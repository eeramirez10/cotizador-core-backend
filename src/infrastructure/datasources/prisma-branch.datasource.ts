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
        street: params.contact.street,
        exteriorNumber: params.contact.exteriorNumber,
        interiorNumber: params.contact.interiorNumber,
        neighborhood: params.contact.neighborhood,
        city: params.contact.city,
        municipality: params.contact.municipality,
        state: params.contact.state,
        postalCode: params.contact.postalCode,
        country: params.contact.country,
        email: params.contact.email,
        phone: params.contact.phone,
        secondaryPhone: params.contact.secondaryPhone,
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
        street: data.contact.street,
        exteriorNumber: data.contact.exteriorNumber,
        interiorNumber: data.contact.interiorNumber,
        neighborhood: data.contact.neighborhood,
        city: data.contact.city,
        municipality: data.contact.municipality,
        state: data.contact.state,
        postalCode: data.contact.postalCode,
        country: data.contact.country,
        email: data.contact.email,
        phone: data.contact.phone,
        secondaryPhone: data.contact.secondaryPhone,
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
