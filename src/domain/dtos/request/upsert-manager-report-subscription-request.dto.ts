import {
  ManagerReportFrequency,
  ManagerReportRange,
  ManagerReportScope,
  ManagerReportType,
} from "../../../infrastructure/database/generated/enums";

export interface UpsertManagerReportSubscriptionProps {
  recipientUserId: string;
  reportType: ManagerReportType;
  scope: ManagerReportScope;
  branchId: string | null;
  frequency: ManagerReportFrequency;
  reportRange: ManagerReportRange;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  sendHour: number;
  sendMinute: number;
  timezone: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UpsertManagerReportSubscriptionRequestDto {
  constructor(public readonly props: UpsertManagerReportSubscriptionProps) {}

  static create(input: unknown): [string?, UpsertManagerReportSubscriptionRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const recipientUserId = typeof body.recipientUserId === "string" ? body.recipientUserId.trim() : "";
    if (!UUID_PATTERN.test(recipientUserId)) return ["recipientUserId is invalid."];

    const reportTypeRaw = typeof body.reportType === "string"
      ? body.reportType.trim().toUpperCase()
      : "QUOTE_PERFORMANCE";
    if (!Object.values(ManagerReportType).includes(reportTypeRaw as ManagerReportType)) {
      return ["reportType is invalid."];
    }

    const scopeRaw = typeof body.scope === "string" ? body.scope.trim().toUpperCase() : "";
    if (!Object.values(ManagerReportScope).includes(scopeRaw as ManagerReportScope)) return ["scope is invalid."];
    const scope = scopeRaw as ManagerReportScope;
    const branchId = typeof body.branchId === "string" && body.branchId.trim() ? body.branchId.trim() : null;
    if (scope === "BRANCH" && (!branchId || !UUID_PATTERN.test(branchId))) return ["branchId is required for BRANCH scope."];
    if (scope === "GLOBAL" && branchId) return ["branchId is not allowed for GLOBAL scope."];

    const frequencyRaw = typeof body.frequency === "string" ? body.frequency.trim().toUpperCase() : "";
    if (!Object.values(ManagerReportFrequency).includes(frequencyRaw as ManagerReportFrequency)) {
      return ["frequency is invalid."];
    }
    const frequency = frequencyRaw as ManagerReportFrequency;
    const reportRangeRaw = typeof body.reportRange === "string"
      ? body.reportRange.trim().toUpperCase()
      : "MONTH_TO_DATE";
    if (!Object.values(ManagerReportRange).includes(reportRangeRaw as ManagerReportRange)) {
      return ["reportRange is invalid."];
    }
    const dayOfWeek = this.optionalInteger(body.dayOfWeek);
    const dayOfMonth = this.optionalInteger(body.dayOfMonth);
    if (frequency === "DAILY" && (dayOfWeek !== null || dayOfMonth !== null)) {
      return ["DAILY frequency does not accept a report day."];
    }
    if (frequency === "WEEKLY" && (dayOfWeek === null || dayOfWeek < 1 || dayOfWeek > 7 || dayOfMonth !== null)) {
      return ["dayOfWeek must be between 1 and 7 for WEEKLY frequency."];
    }
    if (frequency === "MONTHLY" && (dayOfMonth === null || dayOfMonth < 1 || dayOfMonth > 28 || dayOfWeek !== null)) {
      return ["dayOfMonth must be between 1 and 28 for MONTHLY frequency."];
    }

    const sendHour = this.requiredInteger(body.sendHour);
    const sendMinute = this.requiredInteger(body.sendMinute);
    if (sendHour === null || sendHour < 0 || sendHour > 23) return ["sendHour must be between 0 and 23."];
    if (sendMinute === null || sendMinute < 0 || sendMinute > 59) return ["sendMinute must be between 0 and 59."];

    const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "America/Mexico_City";
    if (!timezone || timezone.length > 80 || !this.isValidTimezone(timezone)) return ["timezone is invalid."];

    return [, new UpsertManagerReportSubscriptionRequestDto({
      recipientUserId,
      reportType: reportTypeRaw as ManagerReportType,
      scope,
      branchId: scope === "BRANCH" ? branchId : null,
      frequency,
      reportRange: reportRangeRaw as ManagerReportRange,
      dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : null,
      dayOfMonth: frequency === "MONTHLY" ? dayOfMonth : null,
      sendHour,
      sendMinute,
      timezone,
    })];
  }

  private static optionalInteger(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    return this.requiredInteger(value);
  }

  private static requiredInteger(value: unknown): number | null {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  private static isValidTimezone(value: string): boolean {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }
}
