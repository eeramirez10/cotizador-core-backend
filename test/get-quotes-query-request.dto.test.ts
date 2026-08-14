import assert from "node:assert/strict";
import test from "node:test";
import { GetQuotesQueryRequestDto } from "../src/domain/dtos/request/get-quotes-query-request.dto";

test("quote listings default to the full view for backwards compatibility", () => {
  const [error, dto] = GetQuotesQueryRequestDto.create({});

  assert.equal(error, undefined);
  assert.equal(dto?.view, "FULL");
});

test("quote listings accept the summary view", () => {
  const [error, dto] = GetQuotesQueryRequestDto.create({ view: "summary" });

  assert.equal(error, undefined);
  assert.equal(dto?.view, "SUMMARY");
});

test("quote listings reject unsupported views", () => {
  const [error] = GetQuotesQueryRequestDto.create({ view: "compact" });

  assert.equal(error, "view must be FULL or SUMMARY.");
});
