import assert from "node:assert/strict";
import test from "node:test";
import { nextManagerReportRunAt } from "../src/domain/use-cases/next-manager-report-run";

const base = {
  frequency: "DAILY" as const,
  dayOfWeek: null,
  dayOfMonth: null,
  sendHour: 8,
  sendMinute: 30,
  timezone: "America/Mexico_City",
};

test("daily report uses the recipient timezone and advances after its slot", () => {
  assert.equal(nextManagerReportRunAt(base, new Date("2026-09-28T13:00:00Z")).toISOString(), "2026-09-28T14:30:00.000Z");
  assert.equal(nextManagerReportRunAt(base, new Date("2026-09-28T14:30:00Z")).toISOString(), "2026-09-29T14:30:00.000Z");
});

test("weekly report respects ISO weekday", () => {
  const schedule = { ...base, frequency: "WEEKLY" as const, dayOfWeek: 1 };
  assert.equal(nextManagerReportRunAt(schedule, new Date("2026-09-29T00:00:00Z")).toISOString(), "2026-10-05T14:30:00.000Z");
});

test("monthly report respects the configured day", () => {
  const schedule = { ...base, frequency: "MONTHLY" as const, dayOfMonth: 28 };
  assert.equal(nextManagerReportRunAt(schedule, new Date("2026-09-28T15:00:00Z")).toISOString(), "2026-10-28T14:30:00.000Z");
});

test("DST gap moves to the first valid local minute", () => {
  const schedule = { ...base, timezone: "America/New_York", sendHour: 2, sendMinute: 30 };
  assert.equal(nextManagerReportRunAt(schedule, new Date("2026-03-08T05:00:00Z")).toISOString(), "2026-03-08T07:00:00.000Z");
  assert.equal(nextManagerReportRunAt(schedule, new Date("2026-03-08T07:00:00Z")).toISOString(), "2026-03-09T06:30:00.000Z");
});

test("DST fold chooses the first occurrence", () => {
  const schedule = { ...base, timezone: "America/New_York", sendHour: 1, sendMinute: 30 };
  assert.equal(nextManagerReportRunAt(schedule, new Date("2026-11-01T04:00:00Z")).toISOString(), "2026-11-01T05:30:00.000Z");
  assert.equal(nextManagerReportRunAt(schedule, new Date("2026-11-01T05:30:00Z")).toISOString(), "2026-11-02T06:30:00.000Z");
});
