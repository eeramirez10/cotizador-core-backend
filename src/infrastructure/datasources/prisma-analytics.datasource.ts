import {
  AnalyticsDashboard,
  AnalyticsDatasource,
  AnalyticsDatasourceParams,
} from "../../domain/datasources/analytics.datasource";
import { prisma } from "../database/prisma-client";

const round2 = (value: number): number => Number(value.toFixed(2));
const quotedStatuses = new Set(["QUOTED", "APPROVED", "REJECTED"]);
const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);
const daysBetween = (from: Date, to: Date): number => Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));

export class PrismaAnalyticsDatasource implements AnalyticsDatasource {
  async getDashboard(params: AnalyticsDatasourceParams): Promise<AnalyticsDashboard> {
    const scopeWhere =
      params.scopeType === "BRANCH"
        ? { branchId: params.scopeId }
        : {
            OR: [
              { createdByUserId: params.scopeId },
              { providedByUserId: params.scopeId },
            ],
          };

    const captureScopeWhere = params.scopeType === "BRANCH"
      ? { branchId: params.scopeId }
      : { createdByUserId: params.scopeId };

    const [rows, captureCountRows] = await Promise.all([
      prisma.quote.findMany({
        where: {
          ...scopeWhere,
          createdAt: { gte: params.from, lt: params.toExclusive },
          currency: params.currency,
        },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          sourceChannel: true,
          captureMethod: true,
          rejectionReason: true,
          total: true,
          orderStatus: true,
          createdAt: true,
          createdByUserId: true,
          providedByUserId: true,
          providedByNameSnapshot: true,
          providedByBranchNameSnapshot: true,
          customer: { select: { displayName: true, legalName: true } },
          createdByUser: { select: { firstName: true, lastName: true } },
          items: {
            select: {
              requiresReview: true,
              productId: true,
              externalProductCode: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.quote.groupBy({
        by: ["captureMethod"],
        where: {
          ...captureScopeWhere,
          createdAt: { gte: params.from, lt: params.toExclusive },
        },
        _count: { _all: true },
      }),
    ]);

    const workedRows = params.scopeType === "USER" ? rows.filter((row) => row.createdByUserId === params.scopeId) : rows;
    const providedRows = params.scopeType === "USER" ? rows.filter((row) => row.providedByUserId === params.scopeId) : [];
    const quotedRows = workedRows.filter((row) => quotedStatuses.has(row.status));
    const approvedRows = workedRows.filter((row) => row.status === "APPROVED");
    const orderRows = workedRows.filter((row) => row.orderStatus === "GENERATED");
    const quotedAmount = quotedRows.reduce((sum, row) => sum + Number(row.total), 0);
    const approvedAmount = approvedRows.reduce((sum, row) => sum + Number(row.total), 0);

    const trend = new Map<string, { date: string; created: number; quoted: number; approved: number; orders: number }>();
    const pipeline = new Map<string, { status: string; count: number; amount: number }>();
    const channels = new Map<string, { channel: string; count: number; amount: number }>();
    const captureMethods = new Map<"SYSTEM" | "EXCEL_IMPORT", { method: "SYSTEM" | "EXCEL_IMPORT"; count: number; amount: number }>();
    const rejectionReasons = new Map<string, { reason: string; count: number; amount: number }>();
    const sellers = new Map<string, { userId: string; name: string; quotes: number; approved: number; quotedAmount: number; approvedAmount: number }>();
    const providers = new Map<string, { userId: string; name: string; branchName: string; quotes: number; approved: number; approvedAmount: number }>();

    for (const row of workedRows) {
      const amount = Number(row.total);
      const date = toDateKey(row.createdAt);
      const daily = trend.get(date) ?? { date, created: 0, quoted: 0, approved: 0, orders: 0 };
      daily.created += 1;
      if (quotedStatuses.has(row.status)) daily.quoted += 1;
      if (row.status === "APPROVED") daily.approved += 1;
      if (row.orderStatus === "GENERATED") daily.orders += 1;
      trend.set(date, daily);

      const stage = pipeline.get(row.status) ?? { status: row.status, count: 0, amount: 0 };
      stage.count += 1;
      stage.amount += amount;
      pipeline.set(row.status, stage);

      const channel = channels.get(row.sourceChannel) ?? { channel: row.sourceChannel, count: 0, amount: 0 };
      channel.count += 1;
      channel.amount += amount;
      channels.set(row.sourceChannel, channel);

      const captureMethod = captureMethods.get(row.captureMethod) ?? {
        method: row.captureMethod,
        count: 0,
        amount: 0,
      };
      captureMethod.count += 1;
      captureMethod.amount += amount;
      captureMethods.set(row.captureMethod, captureMethod);

      if (row.status === "REJECTED" && row.rejectionReason) {
        const reason = rejectionReasons.get(row.rejectionReason) ?? { reason: row.rejectionReason, count: 0, amount: 0 };
        reason.count += 1;
        reason.amount += amount;
        rejectionReasons.set(row.rejectionReason, reason);
      }

      const sellerName = `${row.createdByUser.firstName} ${row.createdByUser.lastName}`.trim();
      const seller = sellers.get(row.createdByUserId) ?? {
        userId: row.createdByUserId,
        name: sellerName,
        quotes: 0,
        approved: 0,
        quotedAmount: 0,
        approvedAmount: 0,
      };
      seller.quotes += 1;
      if (quotedStatuses.has(row.status)) seller.quotedAmount += amount;
      if (row.status === "APPROVED") {
        seller.approved += 1;
        seller.approvedAmount += amount;
      }
      sellers.set(row.createdByUserId, seller);

      if (row.providedByUserId) {
        const provider = providers.get(row.providedByUserId) ?? {
          userId: row.providedByUserId,
          name: row.providedByNameSnapshot || "Usuario",
          branchName: row.providedByBranchNameSnapshot || "Sin sucursal",
          quotes: 0,
          approved: 0,
          approvedAmount: 0,
        };
        provider.quotes += 1;
        if (row.status === "APPROVED") {
          provider.approved += 1;
          provider.approvedAmount += amount;
        }
        providers.set(row.providedByUserId, provider);
      }
    }

    for (const row of captureCountRows) {
      const current = captureMethods.get(row.captureMethod) ?? {
        method: row.captureMethod,
        count: 0,
        amount: 0,
      };
      current.count = row._count._all;
      captureMethods.set(row.captureMethod, current);
    }

    const pendingQuotes = workedRows
      .filter((row) => row.status === "DRAFT" || row.status === "PENDING")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 10)
      .map((row) => ({
        id: row.id,
        quoteNumber: row.quoteNumber,
        customerName: row.customer.legalName || row.customer.displayName,
        status: row.status,
        total: round2(Number(row.total)),
        createdAt: row.createdAt.toISOString(),
        daysOpen: daysBetween(row.createdAt, new Date()),
      }));

    const to = new Date(params.toExclusive);
    to.setUTCDate(to.getUTCDate() - 1);

    return {
      scope: { type: params.scopeType, id: params.scopeId, name: params.scopeName },
      period: { from: toDateKey(params.from), to: toDateKey(to), currency: params.currency },
      kpis: {
        created: workedRows.length,
        quoted: quotedRows.length,
        approved: approvedRows.length,
        quotedAmount: round2(quotedAmount),
        approvedAmount: round2(approvedAmount),
        averageTicket: approvedRows.length > 0 ? round2(approvedAmount / approvedRows.length) : 0,
        conversionRate: quotedRows.length > 0 ? round2((approvedRows.length / quotedRows.length) * 100) : 0,
        pending: workedRows.filter((row) => row.status === "DRAFT" || row.status === "PENDING").length,
        ordersGenerated: orderRows.length,
        orderAmount: round2(orderRows.reduce((sum, row) => sum + Number(row.total), 0)),
        pendingItems: workedRows.reduce(
          (sum, row) => sum + row.items.filter((item) => item.requiresReview || (!item.productId && !item.externalProductCode)).length,
          0
        ),
      },
      trend: [...trend.values()],
      pipeline: [...pipeline.values()].map((row) => ({ ...row, amount: round2(row.amount) })),
      channels: [...channels.values()].map((row) => ({ ...row, amount: round2(row.amount) })),
      captureMethods: [...captureMethods.values()].map((row) => ({ ...row, amount: round2(row.amount) })),
      rejectionReasons: [...rejectionReasons.values()]
        .map((row) => ({ ...row, amount: round2(row.amount) }))
        .sort((a, b) => b.count - a.count),
      sellerRanking: [...sellers.values()]
        .map((row) => ({
          ...row,
          quotedAmount: round2(row.quotedAmount),
          approvedAmount: round2(row.approvedAmount),
          conversionRate: row.quotes > 0 ? round2((row.approved / row.quotes) * 100) : 0,
        }))
        .sort((a, b) => b.approvedAmount - a.approvedAmount || b.quotedAmount - a.quotedAmount),
      providerRanking: [...providers.values()]
        .map((row) => ({ ...row, approvedAmount: round2(row.approvedAmount) }))
        .sort((a, b) => b.approvedAmount - a.approvedAmount || b.quotes - a.quotes),
      attribution: {
        direct: workedRows.filter((row) => !row.providedByUserId).length,
        provided: workedRows.filter((row) => !!row.providedByUserId).length,
      },
      contribution: {
        workedQuotes: workedRows.length,
        workedApprovedAmount: round2(approvedAmount),
        providedQuotes: providedRows.length,
        providedApprovedAmount: round2(
          providedRows.filter((row) => row.status === "APPROVED").reduce((sum, row) => sum + Number(row.total), 0)
        ),
      },
      pendingQuotes,
    };
  }
}
