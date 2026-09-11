import type {
  ManagerReportSellerRow,
  ManagerReportSnapshot,
} from "../contracts/manager-report-pdf.port";
import type { ManagerReportSubscriptionEntity } from "../entities/manager-report-subscription.entity";
import type { AnalyticsRepository } from "../repositories/analytics.repository";

interface BuildManagerReportPeriod {
  from: Date;
  toExclusive: Date;
}

export class BuildManagerReportUseCase {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async execute(
    subscription: ManagerReportSubscriptionEntity,
    period: BuildManagerReportPeriod,
  ): Promise<ManagerReportSnapshot> {
    const scopeType = subscription.scope === "GLOBAL" ? "GLOBAL" : "BRANCH";
    const scopeId = subscription.scope === "GLOBAL" ? "GLOBAL" : subscription.branchId || "";
    const scopeName = subscription.scope === "GLOBAL"
      ? "Todas las sucursales"
      : subscription.branch?.name || "Sucursal";
    const common = {
      scopeType,
      scopeId,
      scopeName,
      from: period.from,
      toExclusive: period.toExclusive,
    } as const;
    const [mxn, usd] = await Promise.all([
      this.analyticsRepository.getDashboard({ ...common, currency: "MXN" }),
      this.analyticsRepository.getDashboard({ ...common, currency: "USD" }),
    ]);

    const sellers = new Map<string, ManagerReportSellerRow>();
    for (const row of mxn.sellerRanking) {
      sellers.set(row.userId, {
        userId: row.userId,
        name: row.name,
        quotes: row.quotes,
        approved: row.approved,
        conversionRate: 0,
        quotedMxn: row.quotedAmount,
        quotedUsd: 0,
        approvedMxn: row.approvedAmount,
        approvedUsd: 0,
      });
    }
    for (const row of usd.sellerRanking) {
      const current = sellers.get(row.userId) || {
        userId: row.userId,
        name: row.name,
        quotes: 0,
        approved: 0,
        conversionRate: 0,
        quotedMxn: 0,
        quotedUsd: 0,
        approvedMxn: 0,
        approvedUsd: 0,
      };
      current.quotes += row.quotes;
      current.approved += row.approved;
      current.quotedUsd += row.quotedAmount;
      current.approvedUsd += row.approvedAmount;
      sellers.set(row.userId, current);
    }

    const sellerRows = [...sellers.values()]
      .map((row) => ({
        ...row,
        conversionRate: row.quotes > 0 ? Number(((row.approved / row.quotes) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.quotedMxn - a.quotedMxn || b.quotedUsd - a.quotedUsd);

    return {
      scopeName,
      periodFrom: mxn.period.from,
      periodTo: mxn.period.to,
      generatedAt: new Date().toISOString(),
      totals: {
        created: mxn.kpis.created + usd.kpis.created,
        quoted: mxn.kpis.quoted + usd.kpis.quoted,
        approved: mxn.kpis.approved + usd.kpis.approved,
        pending: mxn.kpis.pending + usd.kpis.pending,
        ordersGenerated: mxn.kpis.ordersGenerated + usd.kpis.ordersGenerated,
        quotedMxn: mxn.kpis.quotedAmount,
        quotedUsd: usd.kpis.quotedAmount,
        approvedMxn: mxn.kpis.approvedAmount,
        approvedUsd: usd.kpis.approvedAmount,
      },
      sellers: sellerRows,
    };
  }
}
