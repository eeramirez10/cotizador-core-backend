import assert from "node:assert/strict";
import test from "node:test";
import { CreateLocalTempProductRequestDto } from "../src/domain/dtos/request/create-local-temp-product-request.dto";
import { UpdateLocalTempProductRequestDto } from "../src/domain/dtos/request/update-local-temp-product-request.dto";

test("allows a quick local product without a cost", () => {
  const [error, dto] = CreateLocalTempProductRequestDto.create({
    description: "Válvula de bola bridada",
    unit: "PZ",
    family: "valve",
    technicalAttributes: {
      diameter: "2 in",
      pressure_class: "150 lb",
    },
  });

  assert.equal(error, undefined);
  assert.equal(dto?.averageCost, null);
  assert.equal(dto?.lastCost, null);
  assert.equal(dto?.family, "valve");
  assert.deepEqual(dto?.technicalAttributes, {
    DIAMETER: "2 IN",
    PRESSURE_CLASS: "150 LB",
  });
});

test("accepts an estimated cost from a price list", () => {
  const [error, dto] = UpdateLocalTempProductRequestDto.create({
    averageCost: 1250.5,
    costStatus: "ESTIMATED",
    costSource: "PRICE_LIST",
  });

  assert.equal(error, undefined);
  assert.equal(dto?.averageCost, 1250.5);
  assert.equal(dto?.costStatus, "ESTIMATED");
  assert.equal(dto?.costSource, "PRICE_LIST");
});

test("does not allow confirming a cost outside procurement", () => {
  const [statusError] = UpdateLocalTempProductRequestDto.create({
    costStatus: "CONFIRMED",
  });
  const [sourceError] = UpdateLocalTempProductRequestDto.create({
    costSource: "SUPPLIER_QUOTE",
  });

  assert.match(statusError || "", /procurement workflow/i);
  assert.match(sourceError || "", /corresponding workflow/i);
});
