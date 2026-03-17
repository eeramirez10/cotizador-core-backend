import {
  CreateLocalTempProductDatasourceParams,
  FindLocalTempByDescriptionAndUnitDatasourceParams,
  FindProductsDatasourceParams,
  FindProductsDatasourceResult,
  ProductDatasource,
  SoftDeleteLocalTempProductByIdDatasourceParams,
  UpdateLocalTempProductDatasourceParams,
} from "../../domain/datasources/product.datasource";
import { ProductEntity } from "../../domain/entities/product.entity";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";
import { ProductMapper } from "../mappers/product.mapper";

const productInclude = {
  branch: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.ProductInclude;

export class PrismaProductDatasource implements ProductDatasource {
  async findPaginated(params: FindProductsDatasourceParams): Promise<FindProductsDatasourceResult> {
    const skip = (params.page - 1) * params.pageSize;
    const where = this.buildFindWhere(params);

    const [total, rows] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip,
        take: params.pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => ProductMapper.toEntity(row)),
      total,
    };
  }

  async findActiveLocalTempByDescriptionAndUnit(
    params: FindLocalTempByDescriptionAndUnitDatasourceParams
  ): Promise<ProductEntity | null> {
    const row = await prisma.product.findFirst({
      where: {
        source: "LOCAL_TEMP",
        isActive: true,
        branchId: params.branchId,
        description: {
          equals: params.description,
          mode: "insensitive",
        },
        unit: {
          equals: params.unit,
          mode: "insensitive",
        },
      },
      include: productInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    });

    if (!row) return null;
    return ProductMapper.toEntity(row);
  }

  async createLocalTemp(params: CreateLocalTempProductDatasourceParams): Promise<ProductEntity> {
    const row = await prisma.product.create({
      data: {
        source: "LOCAL_TEMP",
        externalId: null,
        externalSystem: null,
        code: null,
        ean: params.ean,
        description: params.description,
        unit: params.unit,
        currency: params.currency,
        averageCost: params.averageCost,
        lastCost: params.lastCost,
        stock: params.stock,
        branchId: params.branchId,
        isActive: true,
        createdByUserId: params.createdByUserId,
        updatedByUserId: params.updatedByUserId,
      },
      include: productInclude,
    });

    return ProductMapper.toEntity(row);
  }

  async updateLocalTempById(params: UpdateLocalTempProductDatasourceParams): Promise<ProductEntity | null> {
    const existing = await prisma.product.findFirst({
      where: {
        id: params.id,
        source: "LOCAL_TEMP",
        isActive: true,
        ...(params.scope.role === "ADMIN" ? {} : { branchId: params.scope.branchId }),
      },
      select: { id: true },
    });

    if (!existing) return null;

    const row = await prisma.product.update({
      where: { id: existing.id },
      data: {
        code: params.data.code,
        ean: params.data.ean,
        description: params.data.description,
        unit: params.data.unit,
        currency: params.data.currency,
        averageCost: params.data.averageCost,
        lastCost: params.data.lastCost,
        stock: params.data.stock,
        isActive: params.data.isActive,
        updatedByUserId: params.data.updatedByUserId,
      },
      include: productInclude,
    });

    return ProductMapper.toEntity(row);
  }

  async softDeleteLocalTempById(
    params: SoftDeleteLocalTempProductByIdDatasourceParams
  ): Promise<boolean> {
    const existing = await prisma.product.findFirst({
      where: {
        id: params.id,
        source: "LOCAL_TEMP",
        isActive: true,
        ...(params.scope.role === "ADMIN" ? {} : { branchId: params.scope.branchId }),
      },
      select: { id: true },
    });

    if (!existing) return false;

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        updatedByUserId: params.updatedByUserId,
      },
    });

    return true;
  }

  private buildFindWhere(params: FindProductsDatasourceParams): Prisma.ProductWhereInput {
    const andFilters: Prisma.ProductWhereInput[] = [this.buildScopeWhere(params)];

    if (typeof params.isActive === "boolean") {
      andFilters.push({ isActive: params.isActive });
    } else if (!params.includeInactive) {
      andFilters.push({ isActive: true });
    }

    if (params.source) {
      andFilters.push({ source: params.source });
    }

    if (params.branchId) {
      andFilters.push({ branchId: params.branchId });
    }

    if (params.search) {
      andFilters.push({
        OR: [
          { description: { contains: params.search, mode: "insensitive" } },
          { unit: { contains: params.search, mode: "insensitive" } },
          { ean: { contains: params.search, mode: "insensitive" } },
          { code: { contains: params.search, mode: "insensitive" } },
          { externalId: { contains: params.search, mode: "insensitive" } },
        ],
      });
    }

    return { AND: andFilters };
  }

  private buildScopeWhere(params: FindProductsDatasourceParams): Prisma.ProductWhereInput {
    if (params.scope.role === "ADMIN") return {};
    return { branchId: params.scope.branchId };
  }
}
