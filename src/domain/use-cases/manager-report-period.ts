import type { ManagerReportRange } from "../../infrastructure/database/generated/enums";

export interface ManagerReportPeriod {
  from: Date;
  toExclusive: Date;
  label: string;
}

const dateKeyInTimezone = (date: Date, timezone: string): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const startOfLocalDate = (dateKey: string, timezone: string): Date => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day);
  let candidate = targetAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
    const representedAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    candidate += targetAsUtc - representedAsUtc;
  }
  return new Date(candidate);
};

const shiftDateKey = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const firstDayOfMonth = (dateKey: string): string => `${dateKey.slice(0, 8)}01`;

export const resolveCurrentManagerReportPeriod = (
  reportRange: ManagerReportRange,
  timezone: string,
  now = new Date(),
): ManagerReportPeriod => {
  const today = dateKeyInTimezone(now, timezone);
  const tomorrow = shiftDateKey(today, 1);
  const [year, month, day] = today.split("-").map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const currentWeekStart = shiftDateKey(today, -(utcDay === 0 ? 6 : utcDay - 1));
  const currentMonthStart = firstDayOfMonth(today);
  let fromKey: string;
  let toExclusiveKey: string;

  switch (reportRange) {
    case "PREVIOUS_DAY":
      fromKey = shiftDateKey(today, -1);
      toExclusiveKey = today;
      break;
    case "WEEK_TO_DATE":
      fromKey = currentWeekStart;
      toExclusiveKey = tomorrow;
      break;
    case "PREVIOUS_WEEK":
      fromKey = shiftDateKey(currentWeekStart, -7);
      toExclusiveKey = currentWeekStart;
      break;
    case "PREVIOUS_MONTH": {
      const previousMonthLastDay = shiftDateKey(currentMonthStart, -1);
      fromKey = firstDayOfMonth(previousMonthLastDay);
      toExclusiveKey = currentMonthStart;
      break;
    }
    case "LAST_7_DAYS":
      fromKey = shiftDateKey(today, -6);
      toExclusiveKey = tomorrow;
      break;
    case "LAST_30_DAYS":
      fromKey = shiftDateKey(today, -29);
      toExclusiveKey = tomorrow;
      break;
    case "MONTH_TO_DATE":
    default:
      fromKey = currentMonthStart;
      toExclusiveKey = tomorrow;
      break;
  }

  const lastIncludedKey = shiftDateKey(toExclusiveKey, -1);

  return {
    from: startOfLocalDate(fromKey, timezone),
    toExclusive: startOfLocalDate(toExclusiveKey, timezone),
    label: fromKey === lastIncludedKey ? fromKey : `${fromKey} al ${lastIncludedKey}`,
  };
};
