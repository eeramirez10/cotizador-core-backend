import assert from "node:assert/strict";
import test from "node:test";
import {
  UpdatePurchaseRequisitionDocumentRequestDto,
  UpdatePurchaseRequisitionItemRequestDto,
  UpdatePurchaseSupplierCodeRequestDto,
} from "../src/domain/dtos/request/purchase-requisition-request.dto";

test("document references are optional and can be cleared without changing other fields", () => {
  const [error, dto] = UpdatePurchaseRequisitionDocumentRequestDto.create({
    shipmentReference: "  P021624  ",
    qualityCertificatesRequired: true,
  });
  assert.equal(error, undefined);
  assert.deepEqual(dto?.data, { shipmentReference: "P021624", qualityCertificatesRequired: true });
  const [, cleared] = UpdatePurchaseRequisitionDocumentRequestDto.create({ shipmentReference: "" });
  assert.equal(cleared?.data.shipmentReference, null);
});

test("document fields reject invalid types and excessive lengths", () => {
  assert.match(UpdatePurchaseRequisitionDocumentRequestDto.create({ shipmentReference: 123 })[0] || "", /invalid/);
  assert.match(UpdatePurchaseRequisitionDocumentRequestDto.create({ shipmentReference: "x".repeat(121) })[0] || "", /120/);
});

test("item owner must be Sales or Purchasing", () => {
  assert.equal(UpdatePurchaseRequisitionItemRequestDto.create({ quotationOwner: "PURCHASING" })[1]?.data.quotationOwner, "PURCHASING");
  assert.match(UpdatePurchaseRequisitionItemRequestDto.create({ quotationOwner: "UNKNOWN" })[0] || "", /invalid/);
});

test("supplier code is independent from ERP and can be cleared", () => {
  assert.equal(UpdatePurchaseSupplierCodeRequestDto.create({ supplierProductCode: " n012r02 " })[1]?.supplierProductCode, "N012R02");
  assert.equal(UpdatePurchaseSupplierCodeRequestDto.create({ supplierProductCode: "" })[1]?.supplierProductCode, null);
  assert.match(UpdatePurchaseSupplierCodeRequestDto.create({})[0] || "", /required/);
  assert.match(UpdatePurchaseSupplierCodeRequestDto.create({ supplierProductCode: 12 })[0] || "", /invalid/);
});
