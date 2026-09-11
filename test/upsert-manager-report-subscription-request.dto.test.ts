import assert from "node:assert/strict";
import test from "node:test";
import { UpsertManagerReportSubscriptionRequestDto } from "../src/domain/dtos/request/upsert-manager-report-subscription-request.dto";

const base = {
  recipientUserId: "f5e09c10-e9df-42b6-a361-0294f42c40ea",
  reportType: "QUOTE_PERFORMANCE",
  scope: "BRANCH",
  branchId: "55fc1da5-ce57-4d9b-a0ef-7be8fcb8a319",
  frequency: "WEEKLY",
  reportRange: "MONTH_TO_DATE",
  dayOfWeek: 1,
  dayOfMonth: null,
  sendHour: 8,
  sendMinute: 30,
  timezone: "America/Mexico_City",
};

test("accepts a valid weekly branch report subscription", () => {
  const [error, dto] = UpsertManagerReportSubscriptionRequestDto.create(base);
  assert.equal(error, undefined);
  assert.equal(dto?.props.dayOfWeek, 1);
  assert.equal(dto?.props.branchId, base.branchId);
  assert.equal(dto?.props.reportRange, "MONTH_TO_DATE");
});

test("keeps report range independent from delivery frequency", () => {
  const [error, dto] = UpsertManagerReportSubscriptionRequestDto.create({
    ...base,
    frequency: "DAILY",
    reportRange: "MONTH_TO_DATE",
    dayOfWeek: null,
  });

  assert.equal(error, undefined);
  assert.equal(dto?.props.frequency, "DAILY");
  assert.equal(dto?.props.reportRange, "MONTH_TO_DATE");
});

test("requires a branch for branch scope", () => {
  const [error] = UpsertManagerReportSubscriptionRequestDto.create({ ...base, branchId: null });
  assert.equal(error, "branchId is required for BRANCH scope.");
});

test("rejects incompatible monthly scheduling fields", () => {
  const [error] = UpsertManagerReportSubscriptionRequestDto.create({
    ...base,
    frequency: "MONTHLY",
    dayOfMonth: 10,
    dayOfWeek: 2,
  });
  assert.equal(error, "dayOfMonth must be between 1 and 28 for MONTHLY frequency.");
});
