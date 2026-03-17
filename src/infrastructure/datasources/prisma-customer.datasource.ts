import {
  CreateCustomerDatasourceParams,
  CustomerAccessScope,
  CustomerDatasource,
  FindCustomerByIdDatasourceParams,
  FindCustomersDatasourceParams,
  FindCustomersDatasourceResult,
  SoftDeleteCustomerByIdDatasourceParams,
  UpdateCustomerByIdDatasourceParams,
} from "../../domain/datasources/customer.datasource";
import { CustomerEntity } from "../../domain/entities/customer.entity";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";
import { CustomerMapper } from "../mappers/customer.mapper";

const customerInclude = {
  createdByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      branchId: true,
      branch: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
  updatedByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      branchId: true,
      branch: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.CustomerInclude;

export class PrismaCustomerDatasource implements CustomerDatasource {
  async findPaginated(params: FindCustomersDatasourceParams): Promise<FindCustomersDatasourceResult> {
    const skip = (params.page - 1) * params.pageSize;
    const where = this.buildFindWhere(params);

    const [total, rows] = await prisma.$transaction([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: customerInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip,
        take: params.pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => CustomerMapper.toEntity(row)),
      total,
    };
  }

  async findById(params: FindCustomerByIdDatasourceParams): Promise<CustomerEntity | null> {
    const row = await prisma.customer.findFirst({
      where: {
        id: params.id,
        isActive: true,
        ...this.buildReadScopeWhere(params.scope),
      },
      include: customerInclude,
    });

    if (!row) return null;
    return CustomerMapper.toEntity(row);
  }

  async create(params: CreateCustomerDatasourceParams): Promise<CustomerEntity> {
    const isErpIdentity =
      params.source === "ERP" && !!params.externalId?.trim() && !!params.externalSystem?.trim();

    if (!isErpIdentity) {
      const row = await prisma.customer.create({
        data: this.buildCreateData(params, {
          attachActorReferences: true,
        }),
        include: customerInclude,
      });

      return CustomerMapper.toEntity(row);
    }

    const normalizedExternalId = params.externalId!.trim();
    const normalizedExternalSystem = params.externalSystem!.trim().toUpperCase();

    try {
      const customer = await prisma.$transaction(async (tx) => {
        const existing = await tx.customer.findFirst({
          where: {
            source: "ERP",
            externalId: normalizedExternalId,
            externalSystem: normalizedExternalSystem,
          },
          include: customerInclude,
          orderBy: [{ isActive: "desc" }, { createdAt: "asc" }, { id: "asc" }],
        });

        if (!existing) {
          return tx.customer.create({
            data: this.buildCreateData(params, {
              externalId: normalizedExternalId,
              externalSystem: normalizedExternalSystem,
              attachActorReferences: false,
            }),
            include: customerInclude,
          });
        }

        return tx.customer.update({
          where: { id: existing.id },
          data: this.buildErpRefreshData(params, {
            externalId: normalizedExternalId,
            externalSystem: normalizedExternalSystem,
          }),
          include: customerInclude,
        });
      });

      return CustomerMapper.toEntity(customer);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.customer.findFirst({
          where: {
            source: "ERP",
            externalId: normalizedExternalId,
            externalSystem: normalizedExternalSystem,
          },
          include: customerInclude,
          orderBy: [{ isActive: "desc" }, { createdAt: "asc" }, { id: "asc" }],
        });

        if (existing) {
          const row =
            existing.isActive
              ? existing
              : await prisma.customer.update({
                  where: { id: existing.id },
                  data: this.buildErpRefreshData(params, {
                    externalId: normalizedExternalId,
                    externalSystem: normalizedExternalSystem,
                  }),
                  include: customerInclude,
                });

          return CustomerMapper.toEntity(row);
        }
      }

      throw error;
    }
  }

  async updateById(params: UpdateCustomerByIdDatasourceParams): Promise<CustomerEntity | null> {
    const updated = await prisma.customer.updateMany({
      where: {
        id: params.id,
        isActive: true,
        ...this.buildWriteScopeWhere(params.scope),
      },
      data: {
        source: params.data.source,
        externalId: params.data.externalId,
        externalSystem: params.data.externalSystem,
        code: params.data.code,
        firstName: params.data.firstName,
        lastName: params.data.lastName,
        displayName: params.data.displayName,
        legalName: params.data.legalName,
        email: params.data.email,
        phone: params.data.phone,
        whatsapp: params.data.whatsapp,
        taxId: params.data.taxId,
        taxRegime: params.data.taxRegime,
        billingStreet: params.data.billingStreet,
        billingCity: params.data.billingCity,
        billingState: params.data.billingState,
        billingPostalCode: params.data.billingPostalCode,
        billingCountry: params.data.billingCountry,
        profileStatus: params.data.profileStatus,
        notes: params.data.notes,
        updatedByUserId: params.data.updatedByUserId,
      },
    });

    if (updated.count === 0) return null;

    return this.findById({
      id: params.id,
      scope: params.scope,
    });
  }

  async softDeleteById(params: SoftDeleteCustomerByIdDatasourceParams): Promise<boolean> {
    const updated = await prisma.customer.updateMany({
      where: {
        id: params.id,
        isActive: true,
        ...this.buildWriteScopeWhere(params.scope),
      },
      data: {
        isActive: false,
        updatedByUserId: params.updatedByUserId,
      },
    });

    return updated.count > 0;
  }

  private buildFindWhere(params: FindCustomersDatasourceParams): Prisma.CustomerWhereInput {
    const andFilters: Prisma.CustomerWhereInput[] = [
      { isActive: true },
      this.buildReadScopeWhere(params.scope),
    ];

    if (params.source) {
      andFilters.push({ source: params.source });
    }

    if (params.profileStatus) {
      andFilters.push({ profileStatus: params.profileStatus });
    }

    if (params.search) {
      andFilters.push({
        OR: [
          { displayName: { contains: params.search, mode: "insensitive" } },
          { firstName: { contains: params.search, mode: "insensitive" } },
          { lastName: { contains: params.search, mode: "insensitive" } },
          { legalName: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } },
          { phone: { contains: params.search, mode: "insensitive" } },
          { whatsapp: { contains: params.search, mode: "insensitive" } },
          { code: { contains: params.search, mode: "insensitive" } },
          { externalId: { contains: params.search, mode: "insensitive" } },
        ],
      });
    }

    return { AND: andFilters };
  }

  private buildReadScopeWhere(scope: CustomerAccessScope): Prisma.CustomerWhereInput {
    if (scope.role === "ADMIN") {
      return {};
    }

    return {
      OR: [
        { source: "ERP" },
        {
          createdByUser: {
            is: {
              branchId: scope.branchId,
            },
          },
        },
      ],
    };
  }

  private buildWriteScopeWhere(scope: CustomerAccessScope): Prisma.CustomerWhereInput {
    if (scope.role === "ADMIN") {
      return {};
    }

    return {
      createdByUser: {
        is: {
          branchId: scope.branchId,
        },
      },
    };
  }

  private buildCreateData(
    params: CreateCustomerDatasourceParams,
    overrides?: {
      externalId?: string | null;
      externalSystem?: string | null;
      attachActorReferences?: boolean;
    }
  ): Prisma.CustomerUncheckedCreateInput {
    const attachActorReferences = overrides?.attachActorReferences ?? true;

    return {
      source: params.source,
      externalId: overrides?.externalId ?? params.externalId,
      externalSystem: overrides?.externalSystem ?? params.externalSystem,
      code: params.code,
      firstName: params.firstName,
      lastName: params.lastName,
      displayName: params.displayName,
      legalName: params.legalName,
      email: params.email,
      phone: params.phone,
      whatsapp: params.whatsapp,
      taxId: params.taxId,
      taxRegime: params.taxRegime,
      billingStreet: params.billingStreet,
      billingCity: params.billingCity,
      billingState: params.billingState,
      billingPostalCode: params.billingPostalCode,
      billingCountry: params.billingCountry,
      profileStatus: params.profileStatus,
      notes: params.notes,
      createdByUserId: attachActorReferences ? params.createdByUserId : null,
      updatedByUserId: attachActorReferences ? params.updatedByUserId : null,
      isActive: true,
    };
  }

  private buildErpRefreshData(
    params: CreateCustomerDatasourceParams,
    identity: { externalId: string; externalSystem: string }
  ): Prisma.CustomerUncheckedUpdateInput {
    return {
      source: "ERP",
      externalId: identity.externalId,
      externalSystem: identity.externalSystem,
      code: params.code,
      firstName: params.firstName,
      lastName: params.lastName,
      displayName: params.displayName,
      legalName: params.legalName,
      email: params.email,
      phone: params.phone,
      whatsapp: params.whatsapp,
      taxId: params.taxId,
      taxRegime: params.taxRegime,
      billingStreet: params.billingStreet,
      billingCity: params.billingCity,
      billingState: params.billingState,
      billingPostalCode: params.billingPostalCode,
      billingCountry: params.billingCountry,
      profileStatus: params.profileStatus,
      notes: params.notes,
      createdByUserId: null,
      updatedByUserId: null,
      isActive: true,
    };
  }
}
