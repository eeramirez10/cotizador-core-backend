export type AnalyticsScopeType = "BRANCH" | "USER";

export interface AnalyticsDatasourceParams {
  scopeType: AnalyticsScopeType;
  scopeId: string;
  scopeName: string;
  from: Date;
  toExclusive: Date;
  currency: "MXN" | "USD";
}

export interface AnalyticsKpis {
  created: number;
  quoted: number;
  approved: number;
  quotedAmount: number;
  approvedAmount: number;
  averageTicket: number;
  conversionRate: number;
  pending: number;
  ordersGenerated: number;
  orderAmount: number;
  pendingItems: number;
}

export interface AnalyticsDashboard {
  scope: { type: AnalyticsScopeType; id: string; name: string };
  period: { from: string; to: string; currency: "MXN" | "USD" };
  kpis: AnalyticsKpis;
  trend: Array<{ date: string; created: number; quoted: number; approved: number; orders: number }>;
  pipeline: Array<{ status: string; count: number; amount: number }>;
  channels: Array<{ channel: string; count: number; amount: number }>;
  rejectionReasons: Array<{ reason: string; count: number; amount: number }>;
  sellerRanking: Array<{
    userId: string;
    name: string;
    quotes: number;
    approved: number;
    quotedAmount: number;
    approvedAmount: number;
    conversionRate: number;
  }>;
  providerRanking: Array<{
    userId: string;
    name: string;
    branchName: string;
    quotes: number;
    approved: number;
    approvedAmount: number;
  }>;
  attribution: { direct: number; provided: number };
  contribution: {
    workedQuotes: number;
    workedApprovedAmount: number;
    providedQuotes: number;
    providedApprovedAmount: number;
  };
  pendingQuotes: Array<{
    id: string;
    quoteNumber: string;
    customerName: string;
    status: string;
    total: number;
    createdAt: string;
    daysOpen: number;
  }>;
}

export abstract class AnalyticsDatasource {
  abstract getDashboard(params: AnalyticsDatasourceParams): Promise<AnalyticsDashboard>;
}
