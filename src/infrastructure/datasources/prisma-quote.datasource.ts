import {
  AddQuoteItemDatasourceParams,
  ChangeQuoteStatusDatasourceParams,
  CreateQuoteDatasourceParams,
  FindQuoteByIdDatasourceParams,
  FindQuotesDatasourceParams,
  FindQuotesDatasourceResult,
  MarkQuoteOrderGeneratedDatasourceParams,
  QuoteAccessScope,
  QuoteDatasource,
  RecordQuoteDeliveryAttemptDatasourceParams,
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
const shouldMoveBackToQuoted = (status: string): boolean => status === "APPROVED" || status === "REJECTED";
const addDaysToDateOnly = (baseDate: Date, days: number): Date => {
  const dateOnly = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  dateOnly.setUTCDate(dateOnly.getUTCDate() + Math.max(0, days));
  return dateOnly;
};

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
          deliveryPlace: params.deliveryPlace,
          paymentTerms: params.paymentTerms,
          validityDays: params.validityDays,
          validUntil: addDaysToDateOnly(params.exchangeRateDate, params.validityDays),
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
          status: true,
          subtotal: true,
          taxRate: true,
          exchangeRateDate: true,
          validityDays: true,
        },
      });
      if (!existing) return null;

      const subtotal = Number(existing.subtotal.toString());
      const nextTaxRate =
        typeof params.data.taxRate === "number" ? params.data.taxRate : Number(existing.taxRate.toString());
      const nextExchangeRateDate = params.data.exchangeRateDate ?? existing.exchangeRateDate;
      const nextValidityDays =
        typeof params.data.validityDays === "number" ? params.data.validityDays : existing.validityDays;
      const tax = round4(subtotal * nextTaxRate);
      const total = round4(subtotal + tax);
      const validUntil = addDaysToDateOnly(nextExchangeRateDate, nextValidityDays);

      await tx.quote.update({
        where: { id: existing.id },
        data: {
          status: shouldMoveBackToQuoted(existing.status) ? "QUOTED" : undefined,
          customerId: params.data.customerId,
          origin: params.data.origin,
          currency: params.data.currency,
          exchangeRate: params.data.exchangeRate,
          exchangeRateDate: params.data.exchangeRateDate,
          taxRate: params.data.taxRate,
          tax,
          total,
          deliveryPlace: params.data.deliveryPlace,
          paymentTerms: params.data.paymentTerms,
          validityDays: params.data.validityDays,
          validUntil,
          notes: params.data.notes,
          updatedByUserId: params.data.updatedByUserId,
        },
      });

      if (shouldMoveBackToQuoted(existing.status)) {
        await tx.quoteEvent.create({
          data: {
            quoteId: existing.id,
            status: "QUOTED",
            note: "Quote edited and moved back to QUOTED status.",
            actorUserId: params.data.updatedByUserId,
          },
        });
      }

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
          status: true,
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
      await this.moveToQuotedAfterEditionIfNeeded(tx, quote.id, quote.status, params.data.updatedByUserId);

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
          status: true,
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
      await this.moveToQuotedAfterEditionIfNeeded(tx, quote.id, quote.status, params.data.updatedByUserId);

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
          status: true,
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
      await this.moveToQuotedAfterEditionIfNeeded(tx, quote.id, quote.status, params.updatedByUserId);
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

  async recordDeliveryAttempt(params: RecordQuoteDeliveryAttemptDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.id,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          status: true,
          firstSentAt: true,
        },
      });
      if (!quote) return null;

      await tx.quoteDeliveryAttempt.create({
        data: {
          quoteId: quote.id,
          channel: params.data.channel,
          recipient: params.data.recipient,
          status: params.data.status,
          providerMessageId: params.data.providerMessageId,
          errorMessage: params.data.errorMessage,
          sentByUserId: params.actorUserId,
          sentAt: params.data.sentAt,
        },
      });

      if (params.data.status === "SENT") {
        await tx.quote.update({
          where: { id: quote.id },
          data: {
            deliveryStatus: "SENT",
            firstSentAt: quote.firstSentAt ?? params.data.sentAt,
            updatedByUserId: params.actorUserId,
          },
        });
      } else {
        await tx.quote.update({
          where: { id: quote.id },
          data: {
            updatedByUserId: params.actorUserId,
          },
        });
      }

      await tx.quoteEvent.create({
        data: {
          quoteId: quote.id,
          status: quote.status,
          note: params.data.note,
          actorUserId: params.actorUserId,
        },
      });

      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async markOrderGenerated(params: MarkQuoteOrderGeneratedDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.id,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          status: true,
        },
      });
      if (!quote) return null;

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          orderStatus: "GENERATED",
          orderGeneratedAt: params.data.generatedAt,
          orderReference: params.data.orderReference,
          updatedByUserId: params.actorUserId,
        },
      });

      await tx.quoteOrderExport.create({
        data: {
          quoteId: quote.id,
          orderReference: params.data.orderReference,
          fileName: params.data.fileName,
          transferStatus: "PENDING_UPLOAD",
          generatedByUserId: params.actorUserId,
          generatedAt: params.data.generatedAt,
        },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: quote.id,
          status: quote.status,
          note: params.data.note,
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

  private async moveToQuotedAfterEditionIfNeeded(
    tx: Prisma.TransactionClient,
    quoteId: string,
    currentStatus: string,
    actorUserId: string
  ): Promise<void> {
    if (!shouldMoveBackToQuoted(currentStatus)) return;

    await tx.quote.update({
      where: { id: quoteId },
      data: {
        status: "QUOTED",
        updatedByUserId: actorUserId,
      },
    });

    await tx.quoteEvent.create({
      data: {
        quoteId,
        status: "QUOTED",
        note: "Quote edited and moved back to QUOTED status.",
        actorUserId,
      },
    });
  }
}
