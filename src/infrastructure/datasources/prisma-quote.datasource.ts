import {
  AddQuoteItemDatasourceParams,
  ChangeQuoteStatusDatasourceParams,
  CreateQuoteDatasourceParams,
  FindQuoteByIdDatasourceParams,
  FindQuotesDatasourceParams,
  FindQuotesDatasourceResult,
  QuoteAccessScope,
  QuoteDatasource,
  RemoveQuoteItemDatasourceParams,
  UpdateQuoteByIdDatasourceParams,
  UpdateQuoteItemDatasourceParams,
} from "../../domain/datasources/quote.datasource";
import { QuoteEntity } from "../../domain/entities/quote.entity";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";
import { QuoteMapper } from "../mappers/quote.mapper";

const quoteInclude = {
  branch: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  customer: {
    select: {
      id: true,
      displayName: true,
      legalName: true,
      email: true,
      phone: true,
      whatsapp: true,
    },
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
  items: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      product: {
        select: {
          id: true,
          code: true,
          ean: true,
          description: true,
          unit: true,
          currency: true,
        },
      },
    },
  },
  events: {
    orderBy: {
      createdAt: "desc",
    },
    include: {
      actorUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} satisfies Prisma.QuoteInclude;

const round4 = (value: number): number => Number(value.toFixed(4));

type DbClient = Prisma.TransactionClient | typeof prisma;

export class PrismaQuoteDatasource implements QuoteDatasource {
  async findPaginated(params: FindQuotesDatasourceParams): Promise<FindQuotesDatasourceResult> {
    const skip = (params.page - 1) * params.pageSize;
    const where = this.buildFindWhere(params);

    const [total, rows] = await prisma.$transaction([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        include: quoteInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip,
        take: params.pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => QuoteMapper.toEntity(row)),
      total,
    };
  }

  async findById(params: FindQuoteByIdDatasourceParams): Promise<QuoteEntity | null> {
    return this.findByIdWithClient(params.id, params.scope, prisma);
  }

  async createDraft(params: CreateQuoteDatasourceParams): Promise<QuoteEntity> {
    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          quoteNumber: params.quoteNumber,
          status: "DRAFT",
          origin: params.origin,
          currency: params.currency,
          exchangeRate: params.exchangeRate,
          exchangeRateDate: params.exchangeRateDate,
          taxRate: params.taxRate,
          subtotal: 0,
          tax: 0,
          total: 0,
          branchId: params.branchId,
          customerId: params.customerId,
          createdByUserId: params.createdByUserId,
          updatedByUserId: params.updatedByUserId,
          notes: params.notes,
        },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: created.id,
          status: "DRAFT",
          note: "Quote created",
          actorUserId: params.createdByUserId,
        },
      });

      const detail = await this.findByIdWithClient(
        created.id,
        {
          role: "ADMIN",
          branchId: params.branchId,
        },
        tx
      );

      if (!detail) throw new Error("Quote created but not found.");
      return detail;
    });

    return quote;
  }

  async updateById(params: UpdateQuoteByIdDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const where = {
        id: params.id,
        ...this.buildScopeWhere(params.scope),
      };

      const existing = await tx.quote.findFirst({
        where,
        select: {
          id: true,
          subtotal: true,
          taxRate: true,
        },
      });
      if (!existing) return null;

      const subtotal = Number(existing.subtotal.toString());
      const nextTaxRate =
        typeof params.data.taxRate === "number" ? params.data.taxRate : Number(existing.taxRate.toString());
      const tax = round4(subtotal * nextTaxRate);
      const total = round4(subtotal + tax);

      await tx.quote.update({
        where: { id: existing.id },
        data: {
          customerId: params.data.customerId,
          origin: params.data.origin,
          currency: params.data.currency,
          exchangeRate: params.data.exchangeRate,
          exchangeRateDate: params.data.exchangeRateDate,
          taxRate: params.data.taxRate,
          tax,
          total,
          notes: params.data.notes,
          updatedByUserId: params.data.updatedByUserId,
        },
      });

      return this.findByIdWithClient(existing.id, params.scope, tx);
    });
  }

  async addItem(params: AddQuoteItemDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.quoteId,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          taxRate: true,
        },
      });

      if (!quote) return null;

      await tx.quoteItem.create({
        data: {
          quoteId: quote.id,
          productId: params.data.productId,
          externalProductCode: params.data.externalProductCode,
          ean: params.data.ean,
          customerDescription: params.data.customerDescription,
          customerUnit: params.data.customerUnit,
          erpDescription: params.data.erpDescription,
          unit: params.data.unit,
          qty: params.data.qty,
          stock: params.data.stock,
          deliveryTime: params.data.deliveryTime,
          cost: params.data.cost,
          costCurrency: params.data.costCurrency,
          marginPct: params.data.marginPct,
          unitPrice: params.data.unitPrice,
          subtotal: params.data.subtotal,
          sourceRequiresReview: params.data.sourceRequiresReview,
          requiresReview: params.data.requiresReview,
        },
      });

      await this.recalculateQuoteTotals(
        tx,
        quote.id,
        Number(quote.taxRate.toString()),
        params.data.updatedByUserId
      );

      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async updateItem(params: UpdateQuoteItemDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.quoteId,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          taxRate: true,
        },
      });
      if (!quote) return null;

      const updated = await tx.quoteItem.updateMany({
        where: {
          id: params.itemId,
          quoteId: quote.id,
        },
        data: {
          productId: params.data.productId,
          externalProductCode: params.data.externalProductCode,
          ean: params.data.ean,
          customerDescription: params.data.customerDescription,
          customerUnit: params.data.customerUnit,
          erpDescription: params.data.erpDescription,
          unit: params.data.unit,
          qty: params.data.qty,
          stock: params.data.stock,
          deliveryTime: params.data.deliveryTime,
          cost: params.data.cost,
          costCurrency: params.data.costCurrency,
          marginPct: params.data.marginPct,
          unitPrice: params.data.unitPrice,
          subtotal: params.data.subtotal,
          sourceRequiresReview: params.data.sourceRequiresReview,
          requiresReview: params.data.requiresReview,
        },
      });

      if (updated.count === 0) return null;

      await this.recalculateQuoteTotals(
        tx,
        quote.id,
        Number(quote.taxRate.toString()),
        params.data.updatedByUserId
      );

      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async removeItem(params: RemoveQuoteItemDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.quoteId,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          taxRate: true,
        },
      });
      if (!quote) return null;

      const deleted = await tx.quoteItem.deleteMany({
        where: {
          id: params.itemId,
          quoteId: quote.id,
        },
      });
      if (deleted.count === 0) return null;

      await this.recalculateQuoteTotals(tx, quote.id, Number(quote.taxRate.toString()), params.updatedByUserId);
      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async changeStatus(params: ChangeQuoteStatusDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.id,
          ...this.buildScopeWhere(params.scope),
        },
        select: { id: true },
      });
      if (!quote) return null;

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: params.status,
          updatedByUserId: params.actorUserId,
        },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: quote.id,
          status: params.status,
          note: params.note,
          actorUserId: params.actorUserId,
        },
      });

      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  private async findByIdWithClient(id: string, scope: QuoteAccessScope, client: DbClient): Promise<QuoteEntity | null> {
    const row = await client.quote.findFirst({
      where: {
        id,
        ...this.buildScopeWhere(scope),
      },
      include: quoteInclude,
    });

    if (!row) return null;
    return QuoteMapper.toEntity(row);
  }

  private buildFindWhere(params: FindQuotesDatasourceParams): Prisma.QuoteWhereInput {
    const andFilters: Prisma.QuoteWhereInput[] = [this.buildScopeWhere(params.scope)];

    if (params.branchId) {
      andFilters.push({ branchId: params.branchId });
    }

    if (params.status) {
      andFilters.push({ status: params.status });
    }

    if (params.search) {
      andFilters.push({
        OR: [
          { quoteNumber: { contains: params.search, mode: "insensitive" } },
          { notes: { contains: params.search, mode: "insensitive" } },
          {
            customer: {
              is: {
                displayName: { contains: params.search, mode: "insensitive" },
              },
            },
          },
          {
            customer: {
              is: {
                legalName: { contains: params.search, mode: "insensitive" },
              },
            },
          },
        ],
      });
    }

    return { AND: andFilters };
  }

  private buildScopeWhere(scope: QuoteAccessScope): Prisma.QuoteWhereInput {
    if (scope.role === "ADMIN") return {};
    return { branchId: scope.branchId };
  }

  private async recalculateQuoteTotals(
    tx: Prisma.TransactionClient,
    quoteId: string,
    taxRate: number,
    updatedByUserId: string
  ): Promise<void> {
    const aggregate = await tx.quoteItem.aggregate({
      where: { quoteId },
      _sum: { subtotal: true },
    });

    const subtotal = aggregate._sum.subtotal ? Number(aggregate._sum.subtotal.toString()) : 0;
    const tax = round4(subtotal * taxRate);
    const total = round4(subtotal + tax);

    await tx.quote.update({
      where: { id: quoteId },
      data: {
        subtotal: round4(subtotal),
        tax,
        total,
        updatedByUserId,
      },
    });
  }
}
