import type { ManagerReportFrequency } from "../../infrastructure/database/generated/enums";

export interface ManagerReportSchedule {
  frequency: ManagerReportFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  sendHour: number;
  sendMinute: number;
  timezone: string;
}

const formatterFor = (timezone: string) => new Intl.DateTimeFormat("en-US", {
  timeZone: timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const localParts = (formatter: Intl.DateTimeFormat, date: Date) => {
  const parts = formatter.formatToParts(date);
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: number("year"), month: number("month"), day: number("day"), hour: number("hour"), minute: number("minute") };
};

export const nextManagerReportRunAt = (schedule: ManagerReportSchedule, after: Date): Date => {
  const formatter = formatterFor(schedule.timezone);
  const localNow = localParts(formatter, after);
  const firstDay = Date.UTC(localNow.year, localNow.month - 1, localNow.day);

  for (let dayOffset = 0; dayOffset <= 32; dayOffset += 1) {
    const calendarDay = new Date(firstDay + dayOffset * 86_400_000);
    const day = calendarDay.getUTCDate();
    const weekday = calendarDay.getUTCDay() || 7;
    if (schedule.frequency === "WEEKLY" && weekday !== schedule.dayOfWeek) continue;
    if (schedule.frequency === "MONTHLY" && day !== schedule.dayOfMonth) continue;

    const target = Date.UTC(calendarDay.getUTCFullYear(), calendarDay.getUTCMonth(), day, schedule.sendHour, schedule.sendMinute);
    let candidate = target;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const represented = localParts(formatter, new Date(candidate));
      const representedUtc = Date.UTC(represented.year, represented.month - 1, represented.day, represented.hour, represented.minute);
      const difference = target - representedUtc;
      if (!difference) break;
      candidate += difference;
    }

    // Search both sides of a DST fold; use the first occurrence. For a skipped
    // local minute, use the first valid minute after the requested time.
    let fallback: Date | null = null;
    let firstExact: Date | null = null;
    for (let minuteOffset = -180; minuteOffset <= 180; minuteOffset += 1) {
      const instant = new Date(candidate + minuteOffset * 60_000);
      const local = localParts(formatter, instant);
      if (local.year !== calendarDay.getUTCFullYear() || local.month !== calendarDay.getUTCMonth() + 1 || local.day !== day) continue;
      const localMinute = local.hour * 60 + local.minute;
      const requestedMinute = schedule.sendHour * 60 + schedule.sendMinute;
      if (localMinute === requestedMinute) {
        if (!firstExact) firstExact = instant;
      }
      if (localMinute > requestedMinute && (!fallback || instant < fallback)) fallback = instant;
    }
    if (firstExact && firstExact > after) return firstExact;
    if (!firstExact && fallback && fallback > after) return fallback;
  }
  throw new Error("Could not determine the next manager report run.");
};
