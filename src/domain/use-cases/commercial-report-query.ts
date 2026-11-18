import { CommercialReportError, REPORT_CHANNEL_LABELS, REPORT_STATUS_LABELS, type ReportCurrency, type ReportFilters } from "../contracts/commercial-report";
import { startOfLocalDate } from "./manager-report-period";

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const REPORT_TIMEZONES = ["America/Mexico_City", "America/Monterrey", "America/Cancun", "America/Chihuahua", "America/Hermosillo", "America/Mazatlan", "America/Tijuana"] as const;

export interface CommercialReportQuery extends ReportFilters {
  from: string;
  to: string;
  fromDate: Date;
  toExclusive: Date;
  branchId?: string;
  currency: ReportCurrency;
  compare: boolean;
  page: number;
  pageSize: number;
  includeBreakdowns: boolean;
  includeDetails: boolean;
}
const shift = (date: string, days: number) => new Date(Date.parse(date + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10);

export function parseCommercialReportQuery(input: Record<string, unknown>): CommercialReportQuery {
  const text = (key: string, fallback = "") => {
    const raw = input[key];
    if (raw === undefined) return fallback;
    if (typeof raw !== "string" || raw.length > 400) throw new CommercialReportError(`El parámetro ${key} no es válido.`);
    return raw.trim();
  };
  const boolean = (key: string, fallback: boolean) => {
    const value = text(key, String(fallback));
    if (!["true", "false"].includes(value)) throw new CommercialReportError(`El parámetro ${key} debe ser true o false.`);
    return value === "true";
  };
  const integer = (key: string, fallback: number, max: number) => {
    const value = text(key, String(fallback));
    if (!/^[1-9]\d*$/.test(value) || Number(value) > max) throw new CommercialReportError(`El parámetro ${key} no es válido.`);
    return Number(value);
  };
  const timezone = text("timezone", "America/Mexico_City");
  if (!(REPORT_TIMEZONES as readonly string[]).includes(timezone)) throw new CommercialReportError("Selecciona una zona horaria disponible.");
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const date = (key: string, fallback: string) => {
    const value = text(key, fallback);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CommercialReportError("Las fechas deben usar AAAA-MM-DD.");
    const parsed = new Date(value + "T00:00:00Z");
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new CommercialReportError("Selecciona fechas válidas.");
    return value;
  };
  const from = date("from", today.slice(0, 8) + "01");
  const to = date("to", today);
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (days < 1 || days > 366) throw new CommercialReportError("El periodo debe tener entre 1 y 366 días.");
  const optionalId = (key: string) => {
    const value = text(key);
    if (value && !uuid.test(value)) throw new CommercialReportError(`El parámetro ${key} no es válido.`);
    return value || undefined;
  };
  const currency = text("currency", "ALL");
  if (!["ALL", "MXN", "USD"].includes(currency)) throw new CommercialReportError("Selecciona MXN, USD o ambas monedas.");
  const statuses = [...new Set(text("statuses").split(",").filter(Boolean))];
  if (statuses.some(status => !Object.hasOwn(REPORT_STATUS_LABELS, status))) throw new CommercialReportError("Selecciona estados válidos.");
  const sourceChannel = text("sourceChannel") || undefined;
  if (sourceChannel && !Object.hasOwn(REPORT_CHANNEL_LABELS, sourceChannel)) throw new CommercialReportError("Selecciona un canal válido.");
  const captureMethod = text("captureMethod") || undefined;
  if (captureMethod && !["SYSTEM", "EXCEL_IMPORT"].includes(captureMethod)) throw new CommercialReportError("Selecciona una forma de captura válida.");
  return {
    from, to, fromDate: startOfLocalDate(from, timezone), toExclusive: startOfLocalDate(shift(to, 1), timezone), timezone,
    branchId: optionalId("branchId"), sellerId: optionalId("sellerId"), currency: currency as ReportCurrency, statuses, sourceChannel, captureMethod,
    compare: boolean("compare", false), page: integer("page", 1, 20000), pageSize: integer("pageSize", 25, 100),
    includeBreakdowns: boolean("includeBreakdowns", true), includeDetails: boolean("includeDetails", false),
  };
}
export const previousReportQuery = (query: CommercialReportQuery): CommercialReportQuery => {
  const days = (Date.parse(query.to) - Date.parse(query.from)) / 86400000 + 1;
  const from = shift(query.from, -days);
  const to = shift(query.from, -1);
  return { ...query, from, to, fromDate: startOfLocalDate(from, query.timezone), toExclusive: startOfLocalDate(query.from, query.timezone), compare: false };
};
