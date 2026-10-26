import assert from "node:assert/strict";
import test from "node:test";
import { erpDraftBranchDefaults } from "../src/domain/use-cases/purchase-item-erp-draft.branch-defaults";

test("ERP account and tax profiles follow the seven branch mappings", () => {
  const expected = [
    ["01", "1115001", "VG"], ["02", "1115002", "V2"], ["03", "1115003", "V3"],
    ["04", "1115004", "V4"], ["05", "1115005", "V5"], ["06", "1115006", "V6"],
    ["07", "1115008", "V7"],
  ];
  for (const [branchCode, primaryAccount, salesProfile] of expected) {
    assert.deepEqual(erpDraftBranchDefaults(branchCode), {
      primaryAccount, secondaryAccount: "4001001", costAccount: "5001001",
      salesProfile, purchaseProfile: "CG",
    });
  }
  assert.equal(erpDraftBranchDefaults("99"), null);
});
