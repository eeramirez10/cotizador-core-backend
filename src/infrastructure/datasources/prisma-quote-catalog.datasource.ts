import { QuoteCatalogDatasource, CreateQuoteCatalogOptionDatasourceParams, QuoteCatalogActorScope, UpdateQuoteCatalogOptionDatasourceParams } from "../../domain/datasources/quote-catalog.datasource";
import { QuoteCatalogOptionEntity } from "../../domain/entities/quote-catalog-option.entity";
import { QuoteCatalogType } from "../database/generated/enums";
import { prisma } from "../database/prisma-client";
import { QuoteCatalogMapper } from "../mappers/quote-catalog.mapper";

export class PrismaQuoteCatalogDatasource implements QuoteCatalogDatasource {
  async listAvailable(branchId: string, type?: QuoteCatalogType): Promise<QuoteCatalogOptionEntity[]> {
    const rows = await prisma.quoteCatalogOption.findMany({
      where: { isActive: true, ...(type ? { type } : {}), OR: [{ branchId: null }, { branchId }] },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    // A branch option with the same code replaces the global default for that branch.
    const scopedByCode = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      const key = `${row.type}:${row.code}`;
      const current = scopedByCode.get(key);
      if (!current || row.branchId === branchId) scopedByCode.set(key, row);
    }
    return [...scopedByCode.values()]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label))
      .map(QuoteCatalogMapper.toEntity);
  }

  async listManaged(actor: QuoteCatalogActorScope): Promise<QuoteCatalogOptionEntity[]> {
    const rows = await prisma.quoteCatalogOption.findMany({
      where: actor.role === "ADMIN" ? {} : { branchId: actor.branchId },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    });
    return rows.map(QuoteCatalogMapper.toEntity);
  }

  async findById(id: string): Promise<QuoteCatalogOptionEntity | null> {
    const row = await prisma.quoteCatalogOption.findUnique({ where: { id: id.trim() } });
    return row ? QuoteCatalogMapper.toEntity(row) : null;
  }

  async existsInScope(type: QuoteCatalogType, code: string, branchId: string | null, excludeId?: string): Promise<boolean> {
    const row = await prisma.quoteCatalogOption.findFirst({
      where: { type, code, branchId, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    return Boolean(row);
  }

  async create(params: CreateQuoteCatalogOptionDatasourceParams): Promise<QuoteCatalogOptionEntity> {
    const row = await prisma.quoteCatalogOption.create({ data: params });
    return QuoteCatalogMapper.toEntity(row);
  }

  async updateById(id: string, params: UpdateQuoteCatalogOptionDatasourceParams): Promise<QuoteCatalogOptionEntity | null> {
    const result = await prisma.quoteCatalogOption.updateMany({ where: { id: id.trim() }, data: params });
    if (result.count === 0) return null;
    return this.findById(id);
  }

  async findActiveByCode(branchId: string, type: QuoteCatalogType, code: string): Promise<QuoteCatalogOptionEntity | null> {
    const rows = await this.listAvailable(branchId, type);
    const row = rows.find((option) => option.branchId === branchId && option.code === code) ?? rows.find((option) => !option.branchId && option.code === code);
    return row ?? null;
  }

  async findActiveByValue(branchId: string, type: QuoteCatalogType, value: string): Promise<QuoteCatalogOptionEntity | null> {
    const rows = await this.listAvailable(branchId, type);
    const normalized = value.trim();
    const row = rows.find((option) => option.branchId === branchId && option.value === normalized) ?? rows.find((option) => !option.branchId && option.value === normalized);
    return row ?? null;
  }

  async findActiveByNumericValue(branchId: string, type: QuoteCatalogType, numericValue: number): Promise<QuoteCatalogOptionEntity | null> {
    const rows = await this.listAvailable(branchId, type);
    const row = rows.find((option) => option.branchId === branchId && option.numericValue === numericValue) ?? rows.find((option) => !option.branchId && option.numericValue === numericValue);
    return row ?? null;
  }
}
