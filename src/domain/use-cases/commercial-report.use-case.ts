import { CommercialReportError, REPORT_CHANNEL_LABELS, REPORT_STATUS_LABELS,
  type CommercialReport, type CommercialReportDirectory, type ReportActor, type ReportGroup, type ReportPdfSection, type ReportQuoteRow } from "../contracts/commercial-report";
import type { AnalyticsRepository } from "../repositories/analytics.repository";
import { combineManagerReportDashboards } from "./build-manager-report.use-case";
import { previousReportQuery, type CommercialReportQuery } from "./commercial-report-query";
import type { AnalyticsDashboard } from "../datasources/analytics.datasource";

const quoted = new Set(["QUOTED", "APPROVED", "REJECTED"]);
const rounding = (value: number) => Number(value.toFixed(2));

export function groupReportRows(rows: ReportQuoteRow[], key: (row: ReportQuoteRow) => [string, string]): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();
  for (const row of rows) {
    const [id, name] = key(row);
    const group = groups.get(id) ?? { id, name, created: 0, approved: 0, orders: 0, quotedMxn: 0, quotedUsd: 0, approvedMxn: 0, approvedUsd: 0 };
    group.created++;
    if (row.orderGenerated) group.orders++;
    if (quoted.has(row.status)) group[row.currency === "MXN" ? "quotedMxn" : "quotedUsd"] += row.total;
    if (row.status === "APPROVED") {
      group.approved++;
      group[row.currency === "MXN" ? "approvedMxn" : "approvedUsd"] += row.total;
    }
    groups.set(id, group);
  }
  return [...groups.values()].map(group => ({ ...group, quotedMxn: rounding(group.quotedMxn), quotedUsd: rounding(group.quotedUsd),
    approvedMxn: rounding(group.approvedMxn), approvedUsd: rounding(group.approvedUsd) }))
    .sort((a, b) => b.created - a.created || a.name.localeCompare(b.name));
}
const emptyDashboard = (reference: AnalyticsDashboard): AnalyticsDashboard => ({
  ...reference, reportRows: [], sellerRanking: [],
  kpis: { created: 0, quoted: 0, approved: 0, quotedAmount: 0, approvedAmount: 0, averageTicket: 0, conversionRate: 0,
    pending: 0, ordersGenerated: 0, orderAmount: 0, pendingItems: 0 },
});
export class CommercialReportUseCase {
  constructor(private readonly analytics: AnalyticsRepository, private readonly directory: CommercialReportDirectory) {}

  async options(actor: ReportActor) {
    if (!["ADMIN", "MANAGER", "SELLER"].includes(actor.role)) throw new CommercialReportError("No tienes acceso a reportes comerciales.", 403);
    return this.directory.options(actor);
  }

  async execute(query: CommercialReportQuery, actor: ReportActor, pdf = false): Promise<CommercialReport> {
    const options = await this.options(actor);
    if (actor.role !== "ADMIN" && query.branchId && query.branchId !== actor.branchId) throw new CommercialReportError("Solo puedes consultar tu sucursal.", 403);
    if (actor.role === "SELLER" && query.sellerId && query.sellerId !== actor.id) throw new CommercialReportError("Solo puedes consultar tu propia actividad.", 403);
    const branchId = actor.role === "ADMIN" ? query.branchId : actor.branchId;
    const sellerId = actor.role === "SELLER" ? actor.id : query.sellerId;
    const branch = branchId ? options.branches.find(row => row.id === branchId) : undefined;
    const seller = sellerId ? options.sellers.find(row => row.id === sellerId && (!branchId || row.branchId === branchId)) : undefined;
    if (branchId && !branch) throw new CommercialReportError("Sucursal no disponible.", 403);
    if (sellerId && !seller) throw new CommercialReportError("Vendedor no disponible para este alcance.", 403);
    const scopeName = [branch?.name || "Todas las sucursales", seller?.name].filter(Boolean).join(" · ");

    const read = async (period: CommercialReportQuery) => {
      const common = { scopeType: branchId ? "BRANCH" as const : "GLOBAL" as const,
        scopeId: branchId || "GLOBAL", scopeName,
        from: period.fromDate, toExclusive: period.toExclusive,
        reportFilters: { sellerId, statuses: query.statuses, sourceChannel: query.sourceChannel, captureMethod: query.captureMethod, timezone: query.timezone } };
      const currencies = query.currency === "ALL" ? ["MXN", "USD"] as const : [query.currency];
      const dashboards = await Promise.all(currencies.map(currency => this.analytics.getDashboard({ ...common, currency })));
      const mxn = dashboards.find(row => row.period.currency === "MXN") || emptyDashboard(dashboards[0]);
      const usd = dashboards.find(row => row.period.currency === "USD") || emptyDashboard(dashboards[0]);
      return { snapshot: combineManagerReportDashboards(mxn, usd, scopeName),
        rows: dashboards.flatMap(row => row.reportRows || []),
        orderMxn: mxn.kpis.orderAmount, orderUsd: usd.kpis.orderAmount };
    };
    const [current, previous] = await Promise.all([read(query), query.compare ? read(previousReportQuery(query)) : null]);
    const rows = current.rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.quoteNumber.localeCompare(b.quoteNumber));
    const pageSize = query.pageSize;
    const totalPages = Math.ceil(rows.length / pageSize);
    const page = Math.min(query.page, Math.max(1, totalPages));
    const filterLabels = [
      `Sucursal: ${branch?.name || "Todas"}`, `Vendedor: ${seller?.name || "Todos"}`,
      `Moneda: ${query.currency === "ALL" ? "MXN y USD (separadas)" : query.currency}`,
      `Estados: ${query.statuses.length ? query.statuses.map(value => REPORT_STATUS_LABELS[value]).join(", ") : "Todos"}`,
      `Canal: ${query.sourceChannel ? REPORT_CHANNEL_LABELS[query.sourceChannel] : "Todos"}`,
      `Captura: ${query.captureMethod ? query.captureMethod === "SYSTEM" ? "Sistema" : "Excel" : "Todas"}`,
    ];
    const breakdowns = {
      branches: groupReportRows(rows, row => [row.branchId, row.branchName]),
      customers: groupReportRows(rows, row => [row.customerId, row.customerName]),
      statuses: groupReportRows(rows, row => [row.status, REPORT_STATUS_LABELS[row.status]]),
      channels: groupReportRows(rows, row => [row.sourceChannel, REPORT_CHANNEL_LABELS[row.sourceChannel]]),
      captureMethods: groupReportRows(rows, row => [row.captureMethod, row.captureMethod === "SYSTEM" ? "Sistema" : "Excel"]),
    };
    const report: CommercialReport = {
      ...current.snapshot, periodFrom: query.from, periodTo: query.to, timezone: query.timezone, currency: query.currency, filterLabels,
      approvalRate: current.snapshot.totals.created ? rounding(current.snapshot.totals.approved / current.snapshot.totals.created * 100) : 0,
      orderMxn: current.orderMxn, orderUsd: current.orderUsd, breakdowns,
      details: { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, totalPages },
      comparison: previous ? { periodFrom: previousReportQuery(query).from, periodTo: previousReportQuery(query).to, totals: previous.snapshot.totals } : null,
    };
    if (pdf) report.sections = this.sections(report, rows, query);
    return report;
  }

  private sections(report: CommercialReport, rows: ReportQuoteRow[], query: CommercialReportQuery): ReportPdfSection[] {
    const money = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const groups = (title: string, values: ReportGroup[]): ReportPdfSection => ({
      title, columns: [{ label: "Nombre", width: 230 }, { label: "Generadas", width: 65, align: "right" },
        { label: "Aprobadas", width: 65, align: "right" }, { label: "Cotiz. MXN", width: 90, align: "right" },
        { label: "Cotiz. USD", width: 90, align: "right" }, { label: "Aprob. MXN", width: 90, align: "right" }, { label: "Aprob. USD", width: 90, align: "right" }],
      rows: values.map(row => [row.name, String(row.created), String(row.approved), money(row.quotedMxn), money(row.quotedUsd), money(row.approvedMxn), money(row.approvedUsd)]),
    });
    const sections: ReportPdfSection[] = [{
      title: "Parametros y metodologia",
      columns: [{ label: "Parametro", width: 150 }, { label: "Valor", width: 570 }],
      rows: [...report.filterLabels.map(value => { const at = value.indexOf(":"); return [value.slice(0, at), value.slice(at + 1).trim()]; }),
        ["Zona horaria", report.timezone], ["Periodo", `${report.periodFrom} al ${report.periodTo}`],
        ["Metodologia", "Cotizaciones creadas en el periodo; una version por familia dentro del periodo. No representa ventas facturadas."],
        ["Monedas", "Los importes MXN y USD no se suman ni se convierten."],
        ["Aprobacion", `${report.approvalRate}% de las cotizaciones generadas.`],
        ["Pedidos MXN", money(report.orderMxn)], ["Pedidos USD", money(report.orderUsd)]],
    }];
    if (report.comparison) sections.push({
      title: `Comparacion: ${report.comparison.periodFrom} al ${report.comparison.periodTo}`,
      columns: [{ label: "Indicador", width: 300 }, { label: "Actual", width: 210, align: "right" }, { label: "Anterior", width: 210, align: "right" }],
      rows: [["Generadas", String(report.totals.created), String(report.comparison.totals.created)],
        ["Aprobadas", String(report.totals.approved), String(report.comparison.totals.approved)],
        ["Pedidos", String(report.totals.ordersGenerated), String(report.comparison.totals.ordersGenerated)],
        ["Cotizado MXN", money(report.totals.quotedMxn), money(report.comparison.totals.quotedMxn)],
        ["Cotizado USD", money(report.totals.quotedUsd), money(report.comparison.totals.quotedUsd)]],
    });
    if (query.includeBreakdowns) sections.push(groups("Por sucursal", report.breakdowns.branches), groups("Por cliente", report.breakdowns.customers),
      groups("Por estado", report.breakdowns.statuses), groups("Por canal", report.breakdowns.channels), groups("Por captura", report.breakdowns.captureMethods));
    if (query.includeDetails) {
      if (rows.length > 1000) throw new CommercialReportError("El PDF detallado admite hasta 1,000 cotizaciones. Reduce el periodo o desactiva el detalle.", 422);
      sections.push({
        title: "Detalle de cotizaciones",
        columns: [{ label: "Folio / referencia", width: 145 }, { label: "Cliente", width: 165 }, { label: "Vendedor", width: 120 },
          { label: "Sucursal", width: 90 }, { label: "Estado", width: 75 }, { label: "Moneda", width: 40 }, { label: "Total", width: 85, align: "right" }],
        rows: rows.map(row => [`${row.quoteNumber}${row.customerReference ? " / " + row.customerReference : ""}`, row.customerName, row.sellerName,
          row.branchName, REPORT_STATUS_LABELS[row.status], row.currency, money(row.total)]),
      });
    }
    if (sections.reduce((total, section) => total + section.rows.length, 0) > 3000) {
      throw new CommercialReportError("El PDF contiene demasiados desgloses. Reduce el periodo o desactiva los desgloses.", 422);
    }
    return sections;
  }
}
