import assert from "node:assert/strict";
import test from "node:test";
import { validateErpClassificationSuggestions } from "../src/domain/use-cases/erp-classification-suggestion.validation";

const catalog = {
  units: [],
  groups: [
    { code: "2", label: "PRODUCTO", options: [
      { code: "2TUB", description: "TUBOS", parentCode: null, satCode: null },
      { code: "2---", description: "NO ASIGNADO", parentCode: null, satCode: null },
    ] },
  ],
};

test("ERP classification suggestions accept only catalog codes supported by description", () => {
  const result = validateErpClassificationSuggestions({ suggestions: [
    { group: "2", code: "2TUB", confidence: 0.91, evidence: "TUBO" },
    { group: "2", code: "2TUB", confidence: 0.99, evidence: "TUBO" },
    { group: "3", code: "3SIN", confidence: 0.99, evidence: "TUBO" },
  ] }, catalog, "TUBO DE ACERO AL CARBONO");
  assert.deepEqual(result, [{ group: "2", code: "2TUB", confidence: 0.91, evidence: "TUBO" }]);
});

test("ERP classification suggestions reject invented, generic and unsupported matches", () => {
  assert.deepEqual(validateErpClassificationSuggestions({ suggestions: [
    { group: "2", code: "2---", confidence: 0.99, evidence: "TUBO" },
    { group: "2", code: "2TUB", confidence: 0.74, evidence: "TUBO" },
    { group: "2", code: "2TUB", confidence: 0.99, evidence: "VÁLVULA" },
    { group: "2", code: "2XXX", confidence: 0.99, evidence: "TUBO" },
  ] }, catalog, "TUBO DE ACERO"), []);
  assert.throws(() => validateErpClassificationSuggestions({}, catalog, "TUBO DE ACERO"), /no válidas/);
});
