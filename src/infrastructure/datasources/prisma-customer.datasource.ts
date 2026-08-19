import {
  CreateCustomerDatasourceParams,
  CreateCustomerContactDatasourceParams,
  CustomerContactWriteData,
  CustomerAccessScope,
  CustomerDatasource,
  DeleteCustomerContactDatasourceParams,
  FindCustomerByIdDatasourceParams,
  FindCustomerContactsDatasourceParams,
  FindCustomersDatasourceParams,
  FindCustomersDatasourceResult,
  SoftDeleteCustomerByIdDatasourceParams,
  UpdateCustomerContactDatasourceParams,
  UpdateCustomerByIdDatasourceParams,
} from "../../domain/datasources/customer.datasource";
import { CustomerContactEntity, CustomerEntity } from "../../domain/entities/customer.entity";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";
import { CustomerMapper } from "../mappers/customer.mapper";

const customerInclude = {
  contacts: {
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  },
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
      try {
        await this.assertUniqueCustomerFields(prisma, {
          email: params.email,
          whatsapp: params.whatsapp,
          taxId: params.taxId,
        });

        const row = await prisma.$transaction(async (tx) => {
          const created = await tx.customer.create({
            data: this.buildCreateData(params, {
              attachActorReferences: true,
            }),
          });
          await this.replaceContacts(tx, created.id, params.contacts);
          return tx.customer.findUniqueOrThrow({ where: { id: created.id }, include: customerInclude });
        });

        return CustomerMapper.toEntity(row);
      } catch (error) {
        throw this.mapCustomerUniqueError(error);
      }
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

        await this.assertUniqueCustomerFields(
          tx,
          {
            email: params.email,
            whatsapp: params.whatsapp,
            taxId: params.taxId,
          },
          existing?.id
        );

        const saved = !existing
          ? await tx.customer.create({
            data: this.buildCreateData(params, {
              externalId: normalizedExternalId,
              externalSystem: normalizedExternalSystem,
              attachActorReferences: false,
            }),
          })
          : await tx.customer.update({
              where: { id: existing.id },
              data: this.buildErpRefreshData(params, {
                externalId: normalizedExternalId,
                externalSystem: normalizedExternalSystem,
              }, existing),
            });
        if (params.contacts.length > 0) {
          if (existing) {
            await this.refreshErpContact(tx, saved.id, params.contacts[0], existing.contacts);
          } else {
            await this.replaceContacts(tx, saved.id, params.contacts);
          }
        }
        return tx.customer.findUniqueOrThrow({ where: { id: saved.id }, include: customerInclude });
      });

      return CustomerMapper.toEntity(customer);
    } catch (error) {
      const mappedError = this.mapCustomerUniqueError(error);
      if (mappedError !== error) throw mappedError;

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
                  }, existing),
                  include: customerInclude,
                });

          return CustomerMapper.toEntity(row);
        }
      }

      throw error;
    }
  }

  async updateById(params: UpdateCustomerByIdDatasourceParams): Promise<CustomerEntity | null> {
    try {
      const row = await prisma.$transaction(async (tx) => {
        await this.assertUniqueCustomerFields(
          tx,
          {
            email: params.data.email,
            whatsapp: params.data.whatsapp,
            taxId: params.data.taxId,
          },
          params.id
        );

        const updated = await tx.customer.updateMany({
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
          billingExteriorNumber: params.data.billingExteriorNumber,
          billingInteriorNumber: params.data.billingInteriorNumber,
          billingNeighborhood: params.data.billingNeighborhood,
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
        if (params.data.contacts) await this.replaceContacts(tx, params.id, params.data.contacts);
        return tx.customer.findFirst({
          where: { id: params.id, isActive: true, ...this.buildReadScopeWhere(params.scope) },
          include: customerInclude,
        });
      });
      return row ? CustomerMapper.toEntity(row) : null;
    } catch (error) {
      throw this.mapCustomerUniqueError(error);
    }
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

  async findContacts(params: FindCustomerContactsDatasourceParams): Promise<CustomerContactEntity[]> {
    const customer = await this.findAccessibleCustomer(params.customerId, params.scope, prisma);
    if (!customer) return [];

    const rows = await prisma.customerContact.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return rows.map((row) => this.mapContactRow(row));
  }

  async createContact(params: CreateCustomerContactDatasourceParams): Promise<CustomerContactEntity | null> {
    return prisma.$transaction(async (tx) => {
      const customer = await this.findAccessibleCustomer(params.customerId, params.scope, tx);
      if (!customer) return null;

      const existingCount = await tx.customerContact.count({
        where: { customerId: customer.id },
      });
      const shouldBePrimary = params.data.isPrimary || existingCount === 0;

      if (shouldBePrimary) {
        await tx.customerContact.updateMany({
          where: { customerId: customer.id },
          data: { isPrimary: false },
        });
      }

      const created = await tx.customerContact.create({
        data: {
          customerId: customer.id,
          name: params.data.name,
          jobTitle: params.data.jobTitle,
          label: params.data.label,
          email: params.data.email,
          phone: params.data.phone,
          phoneExtension: params.data.phoneExtension,
          mobile: params.data.mobile,
          isPrimary: shouldBePrimary,
        },
      });

      await this.ensurePrimaryContact(tx, customer.id);
      await this.syncCustomerFromPrimaryContact(tx, customer.id);

      return this.mapContactRow(created);
    });
  }

  async updateContact(params: UpdateCustomerContactDatasourceParams): Promise<CustomerContactEntity | null> {
    return prisma.$transaction(async (tx) => {
      const customer = await this.findAccessibleCustomer(params.customerId, params.scope, tx);
      if (!customer) return null;

      const existing = await tx.customerContact.findFirst({
        where: {
          id: params.contactId,
          customerId: customer.id,
        },
      });
      if (!existing) return null;

      const shouldSetPrimary = params.data.isPrimary === true;
      if (shouldSetPrimary) {
        await tx.customerContact.updateMany({
          where: { customerId: customer.id },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.customerContact.update({
        where: { id: existing.id },
        data: {
          name: params.data.name,
          jobTitle: params.data.jobTitle,
          label: params.data.label,
          email: params.data.email,
          phone: params.data.phone,
          phoneExtension: params.data.phoneExtension,
          mobile: params.data.mobile,
          isPrimary: params.data.isPrimary,
        },
      });

      await this.ensurePrimaryContact(tx, customer.id);
      await this.syncCustomerFromPrimaryContact(tx, customer.id);

      return this.mapContactRow(updated);
    });
  }

  async deleteContact(params: DeleteCustomerContactDatasourceParams): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const customer = await this.findAccessibleCustomer(params.customerId, params.scope, tx);
      if (!customer) return false;

      const existing = await tx.customerContact.findFirst({
        where: {
          id: params.contactId,
          customerId: customer.id,
        },
        select: {
          id: true,
        },
      });
      if (!existing) return false;

      await tx.customerContact.delete({
        where: { id: existing.id },
      });

      await this.ensurePrimaryContact(tx, customer.id);
      await this.syncCustomerFromPrimaryContact(tx, customer.id);
      return true;
    });
  }

  private async assertUniqueCustomerFields(
    client: Prisma.TransactionClient | typeof prisma,
    fields: {
      email?: string | null;
      whatsapp?: string | null;
      taxId?: string | null;
    },
    excludeCustomerId?: string
  ): Promise<void> {
    const excludeCurrentCustomer = excludeCustomerId ? { id: { not: excludeCustomerId } } : {};
    const baseWhere = {
      isActive: true,
      ...excludeCurrentCustomer,
    };

    const email = fields.email?.trim().toLowerCase();
    if (email) {
      const duplicate = await client.customer.findFirst({
        where: {
          ...baseWhere,
          email: { equals: email, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (duplicate) throw new Error("Ya existe un cliente con ese correo.");
    }

    const whatsapp = fields.whatsapp?.trim();
    if (whatsapp) {
      const duplicate = await client.customer.findFirst({
        where: {
          ...baseWhere,
          whatsapp,
        },
        select: { id: true },
      });
      if (duplicate) throw new Error("Ya existe un cliente con ese WhatsApp.");
    }

    const taxId = fields.taxId?.trim();
    if (taxId) {
      const duplicate = await client.customer.findFirst({
        where: {
          ...baseWhere,
          taxId: { equals: taxId, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (duplicate) throw new Error("Ya existe un cliente con ese RFC.");
    }
  }

  private mapCustomerUniqueError(error: unknown): Error | unknown {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      return error;
    }

    const target = JSON.stringify(error.meta?.target || "").toLowerCase();
    if (target.includes("email")) return new Error("Ya existe un cliente con ese correo.");
    if (target.includes("whatsapp")) return new Error("Ya existe un cliente con ese WhatsApp.");
    if (target.includes("tax") || target.includes("rfc")) return new Error("Ya existe un cliente con ese RFC.");

    return new Error("Ya existe un cliente con ese correo, WhatsApp o RFC.");
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
          {
            contacts: {
              some: {
                OR: [
                  { name: { contains: params.search, mode: "insensitive" } },
                  { email: { contains: params.search, mode: "insensitive" } },
                  { phone: { contains: params.search, mode: "insensitive" } },
                  { mobile: { contains: params.search, mode: "insensitive" } },
                ],
              },
            },
          },
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

  private async findAccessibleCustomer(
    customerId: string,
    scope: CustomerAccessScope,
    client: Prisma.TransactionClient | typeof prisma
  ): Promise<{
    id: string;
    email: string | null;
    phone: string | null;
    whatsapp: string;
  } | null> {
    return client.customer.findFirst({
      where: {
        id: customerId,
        isActive: true,
        ...this.buildReadScopeWhere(scope),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        whatsapp: true,
      },
    });
  }

  private mapContactRow(row: {
    id: string;
    customerId: string;
    name: string;
    jobTitle: string | null;
    label: string | null;
    email: string | null;
    phone: string | null;
    phoneExtension: string | null;
    mobile: string | null;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CustomerContactEntity {
    return {
      id: row.id,
      customerId: row.customerId,
      name: row.name,
      jobTitle: row.jobTitle,
      label: row.label,
      email: row.email,
      phone: row.phone,
      phoneExtension: row.phoneExtension,
      mobile: row.mobile,
      isPrimary: row.isPrimary,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async replaceContacts(
    tx: Prisma.TransactionClient,
    customerId: string,
    contacts: CustomerContactWriteData[]
  ): Promise<void> {
    await tx.customerContact.deleteMany({ where: { customerId } });
    if (contacts.length === 0) return;
    await tx.customerContact.createMany({
      data: contacts.map((contact, index) => ({
        customerId,
        name: contact.name,
        jobTitle: contact.jobTitle,
        label: contact.label,
        email: contact.email,
        phone: contact.phone,
        phoneExtension: contact.phoneExtension,
        mobile: contact.mobile,
        isPrimary: contact.isPrimary || (index === 0 && !contacts.some((entry) => entry.isPrimary)),
      })),
    });
  }

  private async refreshErpContact(
    tx: Prisma.TransactionClient,
    customerId: string,
    incoming: CustomerContactWriteData,
    existingContacts: Array<{
      id: string;
      isPrimary: boolean;
      createdAt: Date;
    }>
  ): Promise<void> {
    const originalErpContact = [...existingContacts].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
    )[0];

    if (originalErpContact) {
      await tx.customerContact.update({
        where: { id: originalErpContact.id },
        data: {
          name: incoming.name,
          jobTitle: incoming.jobTitle,
          label: incoming.label,
          email: incoming.email,
          phone: incoming.phone,
          phoneExtension: incoming.phoneExtension,
          mobile: incoming.mobile,
          isPrimary: originalErpContact.isPrimary,
        },
      });
    } else {
      await tx.customerContact.create({
        data: {
          customerId,
          name: incoming.name,
          jobTitle: incoming.jobTitle,
          label: incoming.label,
          email: incoming.email,
          phone: incoming.phone,
          phoneExtension: incoming.phoneExtension,
          mobile: incoming.mobile,
          isPrimary: true,
        },
      });
    }

    await this.ensurePrimaryContact(tx, customerId);
    await this.syncCustomerFromPrimaryContact(tx, customerId);
  }

  private async ensurePrimaryContact(tx: Prisma.TransactionClient, customerId: string): Promise<void> {
    const primaryCount = await tx.customerContact.count({
      where: {
        customerId,
        isPrimary: true,
      },
    });
    if (primaryCount > 0) return;

    const first = await tx.customerContact.findFirst({
      where: { customerId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!first) return;

    await tx.customerContact.update({
      where: { id: first.id },
      data: { isPrimary: true },
    });
  }

  private async syncCustomerFromPrimaryContact(tx: Prisma.TransactionClient, customerId: string): Promise<void> {
    const [customer, contacts] = await Promise.all([
      tx.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          email: true,
          phone: true,
          whatsapp: true,
        },
      }),
      tx.customerContact.findMany({
        where: { customerId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          email: true,
          phone: true,
          mobile: true,
          isPrimary: true,
        },
      }),
    ]);

    if (!customer || contacts.length === 0) return;

    const primary = contacts.find((contact) => contact.isPrimary) || contacts[0];
    const delivery = primary.email || primary.mobile
      ? primary
      : contacts.find((contact) => contact.email || contact.mobile);

    const primaryEmail = delivery?.email?.trim() || null;
    const primaryPhone = primary.phone?.trim() || null;
    const primaryMobile = delivery?.mobile?.trim() || null;

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        email: delivery ? primaryEmail : customer.email,
        phone: primaryPhone || delivery?.phone?.trim() || customer.phone,
        whatsapp: delivery ? primaryMobile || "" : customer.whatsapp || "",
      },
    });
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
      billingExteriorNumber: params.billingExteriorNumber,
      billingInteriorNumber: params.billingInteriorNumber,
      billingNeighborhood: params.billingNeighborhood,
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
    identity: { externalId: string; externalSystem: string },
    existing: {
      firstName: string;
      lastName: string;
      displayName: string;
      legalName: string | null;
      email: string | null;
      phone: string | null;
      whatsapp: string;
      taxId: string | null;
      taxRegime: string | null;
      billingStreet: string | null;
      billingCity: string | null;
      billingState: string | null;
      billingPostalCode: string | null;
      billingCountry: string | null;
      profileStatus: Prisma.CustomerUncheckedUpdateInput["profileStatus"];
      notes: string | null;
      code: string | null;
    }
  ): Prisma.CustomerUncheckedUpdateInput {
    const firstName = this.pickRequiredFromErp(params.firstName, existing.firstName, "SIN_NOMBRE");
    const lastName = this.pickRequiredFromErp(params.lastName, existing.lastName, ".");
    const displayName =
      this.pickOptionalFromErp(params.displayName, existing.displayName) || `${firstName} ${lastName}`.trim();

    return {
      source: "ERP",
      externalId: identity.externalId,
      externalSystem: identity.externalSystem,
      code: this.pickOptionalFromErp(params.code, existing.code),
      firstName,
      lastName,
      displayName,
      legalName: this.pickOptionalFromErp(params.legalName, existing.legalName),
      email: this.pickOptionalFromErp(params.email, existing.email),
      phone: this.pickOptionalFromErp(params.phone, existing.phone),
      whatsapp: this.pickRequiredFromErp(params.whatsapp, existing.whatsapp, ""),
      taxId: this.pickOptionalFromErp(params.taxId, existing.taxId),
      taxRegime: this.pickOptionalFromErp(params.taxRegime, existing.taxRegime),
      billingStreet: this.pickOptionalFromErp(params.billingStreet, existing.billingStreet),
      billingCity: this.pickOptionalFromErp(params.billingCity, existing.billingCity),
      billingState: this.pickOptionalFromErp(params.billingState, existing.billingState),
      billingPostalCode: this.pickOptionalFromErp(params.billingPostalCode, existing.billingPostalCode),
      billingCountry: this.pickOptionalFromErp(params.billingCountry, existing.billingCountry),
      profileStatus: params.profileStatus ?? existing.profileStatus,
      notes: this.pickOptionalFromErp(params.notes, existing.notes),
      createdByUserId: null,
      updatedByUserId: null,
      isActive: true,
    };
  }

  private pickOptionalFromErp(incoming: string | null | undefined, current: string | null): string | null {
    if (typeof incoming === "string") {
      const trimmed = incoming.trim();
      if (trimmed.length > 0) return trimmed;
      return current;
    }
    return current;
  }

  private pickRequiredFromErp(incoming: string | null | undefined, current: string, fallback: string): string {
    const candidate = this.pickOptionalFromErp(incoming, current);
    if (candidate && candidate.trim().length > 0) return candidate.trim();
    return fallback;
  }
}
