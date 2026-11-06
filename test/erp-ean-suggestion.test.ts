import assert from "node:assert/strict";
import test from "node:test";
import { buildEanCandidate, describeEanProduct, rankEanReferences, validateEanExtraction, type EanCatalogReference, type EanOrigin } from "../src/domain/use-cases/erp-ean-suggestion";
import { suggestEanWithCatalog, type EanCatalogLookup } from "../src/domain/use-cases/erp-ean-catalog-suggestion";

const empty = { attributes: [], unmapped: [] };
const build = (description: string, origin?: EanOrigin) => buildEanCandidate(description, empty, { origin });
const reference = (code: string, ean: string, description: string): EanCatalogReference => ({ code, ean, description, family: "B009", productType: 1, branchCode: "01" });

for (const size of ['1 1/2"', '1-1/2"', '1½"', '1.5 pulgadas']) {
  test(`builds a fractional seamless stainless pipe from ${size}`, () => {
    const result = build(`Tubo inoxidable sin costura T-316 ${size} cédula 40, nacional`);
    assert.equal(result.candidate, "TSC11/240AI316");
    assert.equal(result.complete, true);
    assert.deepEqual(result.missingFields, []);
  });
}

test("uses Mexico grooved carbon pipe and galvanized end conventions", () => {
  assert.equal(build('Tubo de acero al carbón sin costura 4" cédula 40 ranurado, nacional').candidate, "TSC440RA");
  assert.equal(build('Tubo de acero al carbón con costura 1/2" cédula 80 galvanizado roscado, nacional').candidate, "TCC1/280GR");
  assert.equal(build('Tubo de acero al carbón con costura 4" cédula 40 galvanizado liso, nacional').candidate, "TCC440GL");
  assert.equal(build('Tubo de acero al carbón con costura 4" cédula 40 galvanizado ranurado, nacional').candidate, "TCC440GRA");
});

test("uses the observed Mexico red variant with a review notice", () => {
  const result = build('Tubo de acero al carbón con costura 10" cédula 20 rojo ranurado, importado');
  assert.equal(result.candidate, "TCC1020RAROJAE");
  assert.equal(result.complete, true);
  assert.ok(result.warnings.some((message) => message.includes("RJARA")));
});

test("requires explicit origin and accepts a human confirmation without changing the description", () => {
  const description = 'Tubo de acero al carbón sin costura 4" cédula 40';
  assert.equal(build(description).complete, false);
  assert.ok(build(description).missingFields.includes("Origen"));
  assert.equal(build(description, "NATIONAL").complete, true);
  assert.equal(build(description, "IMPORTED").candidate, "TSC440E");
  assert.equal(build(`${description}, nacional`, "IMPORTED").complete, false);
  assert.equal(build(`${description}, norma internacional`).complete, false);
});

test("never chooses one of several diameters, schedules or explicit materials", () => {
  for (const description of [
    'Tubo de acero al carbón sin costura 2" o 4" cédula 40, nacional',
    'Tubo de acero al carbón sin costura 4" cédula 40 o cédula 20, nacional',
    'Tubo de acero al carbón e inoxidable 316 sin costura 4" cédula 40, nacional',
  ]) assert.equal(build(description).complete, false);
});

test("does not reinterpret compact improper fractions or unsupported grade segments", () => {
  assert.equal(build('Tubo de acero al carbón sin costura 11/2" cédula 40, nacional').complete, false);
  assert.equal(build('Tubo de acero al carbón sin costura 4" cédula 40 X52, nacional').complete, false);
  assert.equal(build('Tubo de acero al carbón sin costura 4" cédula STD, nacional').complete, false);
  assert.equal(build('Tubo inoxidable sin costura 4" cédula 40, nacional').complete, false);
});

test("builds a weld-neck flange including face, bore and stainless grade", () => {
  const result = build('Brida inoxidable T-304 con cuello WN 4" clase 600 cara realzada barreno 40, nacional');
  assert.equal(result.candidate, "BWN4600CRB40AI304");
  assert.equal(result.complete, true);
  assert.equal(build('Brida de acero al carbón con cuello 2" clase 150 cara realzada B. STD, nacional').candidate, "BWN2150CR");
});

test("builds slip-on, blind, socket-weld and threaded flanges", () => {
  for (const [kind, expected] of [["slip-on", "BSO"], ["ciega", "BC"], ["caja soldar", "BSW"], ["roscada", "BR"]]) {
    const result = build(`Brida ${kind} de acero al carbón 2" clase 150 cara realzada, importada`);
    assert.equal(result.candidate, `${expected}2150CRE`);
    assert.equal(result.complete, true);
  }
  assert.equal(build('Brida slip-on inoxidable 316 3" clase 150 cara plana, nacional').candidate, "BSO3150CPAI316");
});

test("incomplete or special flanges require more information", () => {
  for (const description of [
    'Brida con cuello de acero al carbón 2" clase 150 cara realzada, nacional',
    'Brida con cuello largo de acero al carbón 2" clase 150 cara realzada B. STD, nacional',
    'Brida slip-on galvanizada de acero al carbón 2" clase 150 cara realzada, nacional',
    'Brida slip-on de acero al carbón 2" clase 150, nacional',
    'Brida con cuello de acero al carbón 2" clase 150 cara realzada barreno 40, cédula 80, nacional',
  ]) assert.equal(build(description).complete, false);
});

test("flange references compare bore and do not infer an unspecified stainless grade", () => {
  const result = rankEanReferences('Brida inoxidable 304 con cuello 4" clase 600 cara realzada barreno 40', [], [
    reference("01200153", "BWN4600CRB40AI304", 'Brida inoxidable T-304 con cuello 4" clase 600 cara realzada B. 40'),
    reference("01200954", "BWN4600CRB80", 'Brida de acero con cuello 4" clase 600 cara realzada B. 80'),
  ]);
  assert.equal(result.length, 1);
  assert.ok(result[0].agreements.includes("Barreno"));
  assert.equal(rankEanReferences('Válvula de bola de acero al carbón 2" clase 150', [], [
    reference("01401971", "VB2150F466T", 'VALV. BOLA A/INOX. (2" 150 LBS.)'),
  ]).length, 0);
});

test("gate and ball valves use catalog prefixes without inventing complete codes", () => {
  const gate = build('Válvula de compuerta de bronce de 2 pulgadas, 150 libras, figura 717, importada');
  assert.equal(gate.candidate, null);
  assert.equal(gate.segments[0].code, "VCO");
  assert.equal(gate.complete, false);
  const ball = build('VÁLVULA DE BOLA BRIDADA DE ACERO AL CARBÓN PASO COMPLETO EXTREMOS BRIDADOS COMPATIBLE CON ASME B16.5 2" CLASE 150');
  assert.equal(ball.candidate, null);
  assert.ok(ball.referencePrefixes.includes("VB2150"));
  assert.equal(describeEanProduct('Válvula check de bola 2"').kind, "CHECK_VALVE");
});

test("grounding rejects literal evidence that contradicts the value", () => {
  const description = "Tubo con costura nacional";
  const result = validateEanExtraction({ attributes: [
    { key: "kind", value: "PIPE", evidence: "Tubo", confidence: 0.95 },
    { key: "seam", value: "SEAMLESS", evidence: "con costura", confidence: 0.95 },
    { key: "origin", value: "IMPORTED", evidence: "nacional", confidence: 0.95 },
    { key: "__proto__", value: "PIPE", evidence: "Tubo", confidence: 1 },
  ], unmapped: ["dato inventado"] }, description);
  assert.deepEqual(result.attributes.map((entry) => entry.key), ["kind"]);
  assert.deepEqual(result.unmapped, []);
});

test("an AI attribute cannot turn a fitting into supported pipe", () => {
  const result = buildEanCandidate('Codo para tubo de acero al carbón con costura 2" cédula 40, nacional', {
    attributes: [{ key: "kind", value: "PIPE", evidence: "tubo", confidence: 0.95 }], unmapped: [],
  });
  assert.equal(result.complete, false);
  assert.equal(result.candidate, null);
});

test("references exclude a conflicting nominal size, material, and branch", () => {
  const result = rankEanReferences('Válvula de bola bridada de acero al carbón 2" clase 150', [], [
    reference("01400500", "VB2150AB", 'VALV. BOLA A/C. BRID. 10.5 K. DE 051 MM. (2" 150 LBS.)'),
    reference("01400506", "VB4150AB", 'VALV. BOLA A/C. BRID. (4" 150 LBS.)'),
    reference("01400036", "VB2F00313SS", 'VALV. BOLA A/INOX. T-316 (2" 150 LBS.)'),
    reference("03400500", "VB2150AB", 'VALV. BOLA A/C. BRID. (2" 150 LBS.)'),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].code, "01400500");
  assert.ok(result[0].agreements.includes("Diámetro"));
  assert.ok(result[0].checks.includes("Norma, paso y fabricante"));
});

const lookup: EanCatalogLookup = {
  findExactEan: async () => ({ matches: [], hasMore: false }),
  findMexicoEanReferences: async () => ({ references: [], hasMore: false }),
};
test("an existing EAN remains usable because the ERP identity is ICOD", async () => {
  const description = 'Tubo de acero al carbón sin costura 4" cédula 40, nacional';
  assert.equal((await suggestEanWithCatalog(description, empty, undefined, lookup)).canApply, true);
  const existing = await suggestEanWithCatalog(description, empty, undefined, { ...lookup,
    findExactEan: async () => ({ matches: [{ code: "01300000", ean: "TSC440", description, productType: 1 }], hasMore: false }),
  });
  assert.equal(existing.canApply, true);
  assert.equal(existing.matches.length, 1);
  assert.ok(existing.notices.some((notice) => notice.includes("ICOD")));
  assert.equal(existing.warnings.some((warning) => warning.includes("ya existe")), false);
});

test("the same EAN in Mexico and Monterrey is informational even when results are truncated", async () => {
  const description = 'Tubo de acero al carbón sin costura 4" cédula 40, nacional';
  const result = await suggestEanWithCatalog(description, empty, undefined, { ...lookup,
    findExactEan: async () => ({ matches: [
      { code: "01300000", ean: "TSC440", description, productType: 1 },
      { code: "02300000", ean: "TSC440", description, productType: 1 },
    ], hasMore: true }),
  });
  assert.equal(result.canApply, true);
  assert.equal(result.matches.length, 2);
  assert.equal(result.hasMore, true);
  assert.equal(result.notices.length, 2);
});

test("repeated EANs do not make an incomplete suggestion applicable", async () => {
  const description = 'Tubo de acero al carbón sin costura 4" cédula 40';
  const result = await suggestEanWithCatalog(description, empty, undefined, { ...lookup,
    findExactEan: async () => ({ matches: [{ code: "02300000", ean: "TSC440", description, productType: 1 }], hasMore: false }),
  });
  assert.equal(result.canApply, false);
  assert.ok(result.missingFields.includes("Origen"));
});

test("catalog failure does not yield an apparently verified suggestion", async () => {
  await assert.rejects(suggestEanWithCatalog('Tubo de acero al carbón sin costura 4" cédula 40, nacional', empty, undefined, {
    ...lookup, findExactEan: async () => { throw new Error("ERP no disponible"); },
  }), /ERP no disponible/);
  await assert.rejects(suggestEanWithCatalog('Válvula de bola de acero al carbón 2" clase 150', empty, undefined, {
    ...lookup, findMexicoEanReferences: async () => { throw new Error("Referencias no disponibles"); },
  }), /Referencias no disponibles/);
});
