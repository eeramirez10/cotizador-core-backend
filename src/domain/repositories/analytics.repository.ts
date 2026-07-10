import {
  AnalyticsDashboard,
  AnalyticsDatasourceParams,
} from "../datasources/analytics.datasource";

export abstract class AnalyticsRepository {
  abstract getDashboard(params: AnalyticsDatasourceParams): Promise<AnalyticsDashboard>;
}
