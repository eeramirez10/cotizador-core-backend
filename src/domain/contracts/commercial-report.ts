import type { AnalyticsDatasourceParams } from "../datasources/analytics.datasource";
import type { ManagerReportSnapshot } from "./manager-report-pdf.port";

export class CommercialReportError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export type ReportActor = { id: string; role: string; branchId: string };
export type ReportCurrency = "ALL" | "MXN" | "USD";
export interface ReportFilters {
  sellerId?: string;
  statuses: string[];
  sourceChannel?: string;
  captureMethod?: string;
  timezone: string;
}
export interface ReportQuoteRow {
  id: string;
  quoteNumber: string;
  customerReference: string | null;
  status: string;
  currency: "MXN" | "USD";
  total: number;
  createdAt: string;
  branchId: string;
  branchName: string;
  sellerId: string;
  sellerName: string;
  customerId: string;
  customerName: string;
  sourceChannel: string;
  captureMethod: string;
  orderGenerated: boolean;
}
export interface ReportGroup {
  id: string;
  name: string;
  created: number;
  approved: number;
  orders: number;
  quotedMxn: number;
  quotedUsd: number;
  approvedMxn: number;
  approvedUsd: number;
}
export interface CommercialReport extends ManagerReportSnapshot {
  timezone: string;
  currency: ReportCurrency;
  filterLabels: string[];
  approvalRate: number;
  orderMxn: number;
  orderUsd: number;
  breakdowns: { branches: ReportGroup[]; customers: ReportGroup[]; statuses: ReportGroup[]; channels: ReportGroup[]; captureMethods: ReportGroup[] };
  details: { items: ReportQuoteRow[]; total: number; page: number; pageSize: number; totalPages: number };
  comparison: { periodFrom: string; periodTo: string; totals: ManagerReportSnapshot["totals"] } | null;
}
export interface ReportOptions {
  branches: Array<{ id: string; name: string; isActive: boolean }>;
  sellers: Array<{ id: string; name: string; branchId: string; isActive: boolean }>;
}
export abstract class CommercialReportDirectory {
  abstract options(actor: ReportActor): Promise<ReportOptions>;
}
export type ScopedReportParams = Omit<AnalyticsDatasourceParams, "currency">;
export const REPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador", PENDING: "Pendiente", PENDING_APPROVAL: "Por aprobar", CHANGES_REQUESTED: "Cambios solicitados",
  QUOTED: "Cotizada", APPROVED: "Aprobada", REJECTED: "Rechazada", CANCELLED: "Cancelada", SUPERSEDED: "Reemplazada",
};
export const REPORT_CHANNEL_LABELS: Record<string, string> = {
  UNSPECIFIED: "Sin especificar", EMAIL: "Correo", PHONE: "Teléfono", WHATSAPP: "WhatsApp",
  AI_ASSISTANT: "Asistente IA", IN_PERSON: "Presencial", OTHER: "Otro",
};
export type ReportPdfSection = {
  title: string;
  columns: Array<{ label: string; width: number; align?: "right" }>;
  rows: string[][];
  note?: string;
};
