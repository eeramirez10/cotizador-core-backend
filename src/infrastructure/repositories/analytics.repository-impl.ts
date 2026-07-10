import {
  AnalyticsDashboard,
  AnalyticsDatasourceParams,
} from "../../domain/datasources/analytics.datasource";
import { AnalyticsRepository } from "../../domain/repositories/analytics.repository";
import { AnalyticsDatasource } from "../../domain/datasources/analytics.datasource";

export class AnalyticsRepositoryImpl implements AnalyticsRepository {
  constructor(private readonly datasource: AnalyticsDatasource) {}

  getDashboard(params: AnalyticsDatasourceParams): Promise<AnalyticsDashboard> {
    return this.datasource.getDashboard(params);
  }
}
