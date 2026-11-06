export const EAN_ATTRIBUTE_VALUES = {
  kind: ["PIPE", "FLANGE", "GATE_VALVE", "BALL_VALVE", "CHECK_VALVE", "BUTTERFLY_VALVE", "GLOBE_VALVE"],
  seam: ["SEAMLESS", "WELDED"],
  material: ["CARBON_STEEL", "BRONZE", "STAINLESS_304", "STAINLESS_316"],
  end: ["THREADED", "GROOVED", "FLANGED", "SOCKET_WELD", "PLAIN"],
  finish: ["RED", "GALVANIZED"],
  origin: ["IMPORTED", "NATIONAL"],
  flangeType: ["WELD_NECK", "SLIP_ON", "SOCKET_WELD", "BLIND", "THREADED"],
  face: ["RAISED", "FLAT", "RTJ"],
} as const;
export type EanAttributeKey = keyof typeof EAN_ATTRIBUTE_VALUES;
export type EanOrigin = "IMPORTED" | "NATIONAL";
export interface EanAttribute { key: EanAttributeKey; value: string; evidence: string; confidence: number }
export interface EanCandidate {
  candidate: string | null;
  segments: Array<{ label: string; code: string; evidence: string }>;
  warnings: string[];
  missingFields: string[];
  complete: boolean;
  attributes: EanAttribute[];
  referencePrefixes: string[];
}
export interface EanCatalogReference {
  code: string;
  ean: string;
  description: string;
  family: string;
  productType: number;
  branchCode: "01";
}
export interface EanReference extends EanCatalogReference { agreements: string[]; checks: string[] }
export const normalizeEanText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toUpperCase().replace(/[“”¨]/g, '"').replace(/\s+/g, " ").trim();
const unique = <T>(values: T[]) => [...new Set(values)];
const patterns: Record<EanAttributeKey, Record<string, RegExp>> = {
  kind: { PIPE: /\bTUBO|\bTUBERIA/, FLANGE: /\bBRIDA/, GATE_VALVE: /COMPUERTA/, BALL_VALVE: /BOLA/,
    CHECK_VALVE: /CHECK|RETENCION/, BUTTERFLY_VALVE: /MARIPOSA/, GLOBE_VALVE: /GLOBO/ },
  seam: { SEAMLESS: /SIN COSTURA|S\/\s*COSTURA/, WELDED: /CON COSTURA|C\/\s*COSTURA|\bC\/C\b/ },
  material: { CARBON_STEEL: /CARBON|\bA\/C\b/, BRONZE: /BRONCE/, STAINLESS_304: /304/, STAINLESS_316: /316/ },
  end: { THREADED: /ROSC/, GROOVED: /RANUR|\bRAN\./, FLANGED: /BRID/, SOCKET_WELD: /SOCKET|\bS\.?W\.?\b/, PLAIN: /LISO|PLAIN/ },
  finish: { RED: /ROJ|VERMELLON/, GALVANIZED: /GALV/ },
  origin: { IMPORTED: /\bIMPORTAD[OA]S?\b/, NATIONAL: /\bNACIONAL(?:ES)?\b/ },
  flangeType: { WELD_NECK: /CON CUELLO|WELD.?NECK|\bWN\b/, SLIP_ON: /SIN CUELLO|SLIP.?ON|\bSO\b/,
    SOCKET_WELD: /CAJA SOLDAR|SOCKET.?WELD|\bSW\b/, BLIND: /CIEGA|BLIND/, THREADED: /ROSCAD|THREADED/ },
  face: { RAISED: /REALZ|RAISED|\bR\.?F\.?\b|\bCR\b/, FLAT: /CARA PLANA|FLAT.?FACE|\bF\.?F\.?\b|\bCP\b/, RTJ: /\bRTJ\b|RING.?JOINT/ },
};
export const validateEanExtraction = (value: unknown, description: string): { attributes: EanAttribute[]; unmapped: string[] } => {
  const root = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  if (!Array.isArray(root.attributes) || !Array.isArray(root.unmapped)) throw new Error("La IA devolvió atributos EAN no válidos.");
  const seen = new Set<string>();
  const attributes = root.attributes.flatMap((entry): EanAttribute[] => {
    if (!entry || typeof entry !== "object") return [];
    const raw = entry as Record<string, unknown>;
    const key = String(raw.key ?? "") as EanAttributeKey;
    const val = String(raw.value ?? "");
    const evidence = typeof raw.evidence === "string" ? raw.evidence.trim() : "";
    const confidence = Number(raw.confidence);
    if (!Object.hasOwn(EAN_ATTRIBUTE_VALUES, key) || !(EAN_ATTRIBUTE_VALUES[key] as readonly string[]).includes(val)
      || seen.has(key) || !evidence || evidence.length > 120 || !normalizeEanText(description).includes(normalizeEanText(evidence))
      || !patterns[key][val].test(normalizeEanText(evidence)) || !Number.isFinite(confidence) || confidence < 0.8 || confidence > 1) return [];
    seen.add(key);
    return [{ key, value: val, evidence, confidence }];
  });
  const unmapped = root.unmapped.flatMap((entry): string[] => typeof entry === "string" && entry.trim() && entry.length <= 120
    && normalizeEanText(description).includes(normalizeEanText(entry)) ? [entry.trim()] : []).slice(0, 8);
  return { attributes, unmapped };
};
interface Measurement { code: string; evidence: string }
interface Profile {
  kind?: string; seam?: string; material?: string; end?: string; finish?: string; origin?: string; flangeType?: string; face?: string;
  diameter?: Measurement; schedule?: Measurement; pressure?: Measurement; figure?: Measurement; bore?: Measurement;
  ambiguous: string[];
}
const first = (text: string, key: EanAttributeKey) => Object.entries(patterns[key]).filter(([, re]) => re.test(text)).map(([val]) => val);
const single = (values: string[]) => values.length === 1 ? values[0] : undefined;
const nominalCode = (value: string): string | null => {
  let text = value.replace(/[½¼¾⅛⅜⅝⅞]/g, (ch) => ({ "½": " 1/2", "¼": " 1/4", "¾": " 3/4", "⅛": " 1/8", "⅜": " 3/8", "⅝": " 5/8", "⅞": " 7/8" })[ch]!).trim();
  text = text.replace(/(\d)-(\d+\/\d+)/g, "$1 $2");
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(text);
  const fraction = /^(\d+)\/(\d+)$/.exec(text);
  if (fraction && Number(fraction[1]) >= Number(fraction[2])) return null;
  if (mixed && Number(mixed[2]) >= Number(mixed[3])) return null;
  const number = mixed ? Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]) : fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(text);
  if (!Number.isFinite(number) || number <= 0 || number > 120 || Math.abs(number * 8 - Math.round(number * 8)) > 0.0001) return null;
  const whole = Math.floor(number), eighths = Math.round((number - whole) * 8);
  if (!eighths) return String(whole);
  const divisor = eighths % 4 === 0 ? 4 : eighths % 2 === 0 ? 2 : 1;
  return `${whole || ""}${eighths / divisor}/${8 / divisor}`;
};
const measurement = (matches: Array<{ code: string; evidence: string }>): Measurement | undefined => {
  return unique(matches.map((m) => m.code)).length === 1 ? matches[0] : undefined;
};
export const describeEanProduct = (description: string, attributes: EanAttribute[] = []): Profile => {
  const text = normalizeEanText(description);
  const profile: Profile = { ambiguous: [] };
  const kind = /CHECK|RETENCION/.test(text) && /VALV/.test(text) ? "CHECK_VALVE"
    : /COMPUERTA/.test(text) ? "GATE_VALVE" : /MARIPOSA/.test(text) ? "BUTTERFLY_VALVE"
      : /GLOBO/.test(text) && /VALV/.test(text) ? "GLOBE_VALVE" : /BOLA/.test(text) && /VALV/.test(text) ? "BALL_VALVE"
        : /^BRIDA\b|\bBRIDA (?:SLIP|WELD|DE ACERO|CIEGA)/.test(text) ? "FLANGE"
          : /\bTUBO\b|\bTUBERIA\b/.test(text) && !/\bNIPLE|\bCODO|\bTEE|\bCOPLE|\bSOPORTE|\bABRAZADERA/.test(text) ? "PIPE" : undefined;
  profile.kind = kind;
  for (const key of ["seam", "material", "end", "finish", "origin", "flangeType", "face"] as const) {
    if (key === "end" && kind === "FLANGE") continue;
    const detected = first(text, key);
    if (detected.length > 1) profile.ambiguous.push(key);
    profile[key] = single(detected);
  }
  // AI may expand abbreviations, but conflicting explicit evidence must remain unresolved.
  for (const attr of attributes) {
    if (attr.key === "kind") {
      if (!profile.kind && !/\bNIPLE|\bCODO|\bTEE|\bCOPLE|\bSOPORTE|\bABRAZADERA/.test(text)) profile.kind = attr.value;
    }
    else if (attr.key === "end" && kind === "FLANGE") continue;
    else if (!profile[attr.key] && !profile.ambiguous.includes(attr.key)) profile[attr.key] = attr.value;
  }
  if (!profile.material && !profile.ambiguous.includes("material")) {
    if (/INOX/.test(text)) profile.material = "STAINLESS_UNSPECIFIED";
    else if (/\bCPVC\b/.test(text)) profile.material = "CPVC";
    else if (/\bPVC\b/.test(text)) profile.material = "PVC";
    else if (/\bHDPE\b/.test(text)) profile.material = "HDPE";
    else if (/LATON/.test(text)) profile.material = "BRASS";
    else if (/(?:HIERRO|FIERRO|H\.)\s*FUNDIDO/.test(text)) profile.material = "CAST_IRON";
  }
  const inchText = text.replace(/[½¼¾⅛⅜⅝⅞]/g, (ch) => ({ "½": " 1/2", "¼": " 1/4", "¾": " 3/4", "⅛": " 1/8", "⅜": " 3/8", "⅝": " 5/8", "⅞": " 7/8" })[ch]!);
  const diameters = [...inchText.matchAll(/(?<![\d./])(\d+[- ]\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(?:"|PULGADAS?\b|PULG\.?(?!\w))/g)]
    .flatMap((m) => { const code = nominalCode(m[1]); return code ? [{ code, evidence: m[0] }] : []; });
  profile.diameter = measurement(diameters);
  if (unique(diameters.map((m) => m.code)).length > 1) profile.ambiguous.push("diameter");
  const schedules = [...text.matchAll(/\b(?:CEDULA|CED\.?|SCH(?:EDULE)?\.?)\s*(XXS|XS|STD|\d{1,3}S?)\b/g)]
    .map((m) => ({ code: m[1], evidence: m[0] }));
  profile.schedule = measurement(schedules);
  if (unique(schedules.map((m) => m.code)).length > 1) profile.ambiguous.push("schedule");
  if (profile.kind === "FLANGE" && profile.flangeType === "WELD_NECK") {
    const bores = [...text.matchAll(/\b(?:BARRENO|B\.)\s*(STD|XXS|XS|\d{1,3})\b/g)]
      .map((m) => ({ code: m[1], evidence: m[0] }));
    if (profile.schedule) bores.push(profile.schedule);
    profile.bore = measurement(bores);
    if (unique(bores.map((m) => m.code)).length > 1) profile.ambiguous.push("bore");
  }
  const pressures = [...text.matchAll(/\b(\d{2,5})\s*(?:LIBRAS?|LBS?\.?|#)(?!\w)|\bCLASE\s*(?:ANSI\s*)?(\d{2,5})\b/g)]
    .map((m) => ({ code: m[1] || m[2], evidence: m[0] }));
  profile.pressure = measurement(pressures);
  if (unique(pressures.map((m) => m.code)).length > 1) profile.ambiguous.push("pressure");
  profile.figure = measurement([...text.matchAll(/\b(?:FIGURA|FIG\.?|F\.)\s*([A-Z0-9][A-Z0-9.-]{0,20})\b/g)]
    .map((m) => ({ code: m[1], evidence: m[0] })));
  return profile;
};
const valvePrefixes: Record<string, string> = { BALL_VALVE: "VB", GATE_VALVE: "VCO", CHECK_VALVE: "VCH", BUTTERFLY_VALVE: "VMA", GLOBE_VALVE: "VGL" };
const flangePrefixes: Record<string, string> = { WELD_NECK: "BWN", SLIP_ON: "BSO", SOCKET_WELD: "BSW", BLIND: "BC", THREADED: "BR" };
const schedules = new Set(["5", "10", "20", "30", "40", "60", "80", "100", "120", "140", "160", "XS", "XXS"]);
const flangeClasses = new Set(["150", "300", "400", "600", "900", "1500", "2500"]);
export const buildEanCandidate = (description: string, extraction: { attributes: EanAttribute[]; unmapped: string[] }, options: { origin?: EanOrigin } = {}): EanCandidate => {
  const p = describeEanProduct(description, extraction.attributes), text = normalizeEanText(description);
  const segments: EanCandidate["segments"] = [], warnings: string[] = [], missingFields: string[] = [];
  const add = (label: string, code: string, evidence: string) => segments.push({ label, code, evidence });
  const missing = (field: string, message: string) => { missingFields.push(field); warnings.push(message); };
  const attributeEvidence = (key: EanAttributeKey) => extraction.attributes.find((a) => a.key === key)?.evidence || description.slice(0, 120);
  if (!p.diameter) missing("Diámetro nominal", "Indica un diámetro nominal inequívoco en pulgadas; se admiten fracciones y medidas decimales equivalentes.");
  const labels: Record<string, string> = { seam: "costura", material: "material", end: "extremos", finish: "acabado", origin: "origen",
    flangeType: "tipo de brida", face: "cara", diameter: "diámetro", schedule: "cédula", pressure: "presión", bore: "barreno" };
  if (p.ambiguous.length) missing("Atributos contradictorios", `La descripción contiene valores distintos para: ${p.ambiguous.map((key) => labels[key] || key).join(", ")}. Confirma cuál corresponde al producto.`);
  const pipe = p.kind === "PIPE", flange = p.kind === "FLANGE";
  let prefix = "";
  if (pipe) {
    if (p.seam) { prefix = p.seam === "SEAMLESS" ? "TSC" : "TCC"; add("Tipo", prefix, attributeEvidence("seam")); }
    else missing("Costura", "Indica si la tubería es con o sin costura.");
    if (p.diameter) add("Diámetro", p.diameter.code, p.diameter.evidence);
    if (p.schedule && schedules.has(p.schedule.code)) add("Cédula", p.schedule.code, p.schedule.evidence);
    else missing("Cédula", "Indica una cédula numérica, XS o XXS. STD y cédulas con sufijo S requieren confirmar su nomenclatura.");
    if (p.end === "FLANGED" || p.end === "SOCKET_WELD") missing("Extremos", "Esta terminación de tubería no tiene una regla confirmada.");
    if (p.material === "STAINLESS_304" || p.material === "STAINLESS_316") {
      if (p.end && p.end !== "PLAIN" || p.finish) missing("Acabado inoxidable", "Confirma la nomenclatura del inoxidable con este acabado o terminación.");
      add("Material", p.material === "STAINLESS_304" ? "AI304" : "AI316", attributeEvidence("material"));
    } else if (p.material !== "CARBON_STEEL") missing("Material", "Confirma acero al carbón, inoxidable 304 o inoxidable 316.");
    if (p.finish === "GALVANIZED") add("Acabado / extremos", p.end === "GROOVED" ? "GRA" : p.end === "THREADED" ? "GR" : "GL", attributeEvidence("finish"));
    else {
      if (p.end === "GROOVED") add("Extremos", "RA", attributeEvidence("end"));
      if (p.end === "THREADED") add("Extremos", "R", attributeEvidence("end"));
      if (p.finish === "RED") { add("Acabado", "ROJA", attributeEvidence("finish")); warnings.push("El catálogo histórico contiene ROJA, RJA, RAROJA y RJARA. Revisa la variante antes de usarla."); }
    }
    if (/\bX[- ]?\d{2}\b|\bGR(?:ADO|\.)\s*[AC]\b|\bP(?:11|22|91)\b|\bPSL[- ]?2\b|\bFBE\b/.test(text)) missing("Grado o recubrimiento especial", "El grado o recubrimiento especial necesita confirmar su segmento EAN.");
  } else if (flange) {
    prefix = flangePrefixes[p.flangeType || ""] || "";
    if (prefix) add("Tipo de brida", prefix, attributeEvidence("flangeType"));
    else missing("Tipo de brida", "Selecciona una descripción explícita: con cuello, slip-on, caja soldar, ciega o roscada.");
    if (/REDUCID|CUELLO LARGO|LARGE.?DIAMETER/.test(text)) missing("Variante de brida", "La brida reducida o de cuello largo requiere una regla específica.");
    if (p.finish) missing("Acabado de brida", "El acabado de esta brida necesita confirmar su segmento EAN.");
    if (p.diameter) add("Diámetro", p.diameter.code, p.diameter.evidence);
    if (p.pressure && flangeClasses.has(p.pressure.code)) add("Clase", p.pressure.code, p.pressure.evidence);
    else missing("Clase de presión", "Indica una clase de presión ANSI inequívoca y soportada.");
    if (p.face) add("Cara", p.face === "RAISED" ? "CR" : p.face === "FLAT" ? "CP" : "RTJ", attributeEvidence("face"));
    else missing("Cara", "Indica cara realzada, cara plana o RTJ.");
    if (p.flangeType === "WELD_NECK") {
      const boreCode = p.bore?.code;
      if (boreCode && (schedules.has(boreCode) || boreCode === "STD")) {
        if (boreCode !== "STD") add("Barreno", `B${boreCode}`, p.bore!.evidence);
      } else missing("Barreno", "Confirma el barreno/cédula de la brida con cuello, incluido si es estándar (B. STD).");
    }
    if (p.material === "STAINLESS_304" || p.material === "STAINLESS_316") add("Material", p.material === "STAINLESS_304" ? "AI304" : "AI316", attributeEvidence("material"));
    else if (p.material !== "CARBON_STEEL") missing("Material", "Confirma acero al carbón, inoxidable 304 o inoxidable 316.");
    if (/\bLF2\b|\bF(?:11|22|51|52|53|55|91)\b/.test(text)) missing("Material aleado", "La brida de acero aleado necesita confirmar el sufijo de material.");
  } else if (p.kind && valvePrefixes[p.kind]) {
    prefix = valvePrefixes[p.kind]; add("Tipo", prefix, attributeEvidence("kind"));
    if (p.diameter) add("Diámetro", p.diameter.code, p.diameter.evidence);
    if (p.pressure) add("Clase", p.pressure.code, p.pressure.evidence);
    if (p.figure) add("Figura", `F${p.figure.code}`, p.figure.evidence);
    missing("Validación de válvula", "Revisa figura, fabricante, material, extremos y paso contra las referencias. La generación completa de válvulas queda pendiente de validar sus variantes.");
  } else missing("Familia soportada", "Las reglas completas disponibles corresponden a tubería y bridas. Confirma la familia del producto.");
  const origin = options.origin || p.origin;
  if (options.origin && p.origin && p.origin !== options.origin) missing("Origen contradictorio", "El origen elegido contradice el indicado en la descripción.");
  if (origin === "IMPORTED") add("Importación", "E", options.origin ? "Importación confirmada por el usuario" : attributeEvidence("origin"));
  else if (origin !== "NATIONAL") missing("Origen", "Confirma origen nacional o importación; no se deduce de INOCAPAS.");
  if (extraction.unmapped.length) warnings.push(`Especificaciones adicionales a revisar: ${extraction.unmapped.join(", ")}.`);
  const structuralFields = pipe ? Boolean(prefix && p.diameter && p.schedule && schedules.has(p.schedule.code))
    : flange ? Boolean(prefix && p.diameter && p.pressure && p.face) : false;
  const candidate = structuralFields ? segments.map((s) => s.code).join("") : null;
  const referencePrefixes = unique([
    ...(prefix && p.diameter ? [prefix + p.diameter.code + (pipe ? p.schedule?.code || "" : p.pressure?.code || ""), prefix + p.diameter.code] : prefix ? [prefix] : []),
    ...(p.kind === "BALL_VALVE" && p.diameter ? [`VBB${p.diameter.code}`, `VBR${p.diameter.code}`] : []),
  ]).slice(0, 8);
  return { candidate, segments, warnings: unique(warnings), missingFields: unique(missingFields), complete: Boolean(candidate) && missingFields.length === 0,
    attributes: extraction.attributes, referencePrefixes };
};
export const rankEanReferences = (description: string, attributes: EanAttribute[], references: EanCatalogReference[]): EanReference[] => {
  const wanted = describeEanProduct(description, attributes);
  const fields: Array<[keyof Profile, string]> = [["kind", "Tipo"], ["material", "Material"], ["seam", "Costura"],
    ["diameter", "Diámetro"], ["schedule", "Cédula"], ["pressure", "Clase"], ["flangeType", "Tipo de brida"], ["face", "Cara"], ["bore", "Barreno"], ["figure", "Figura"], ["end", "Extremos"], ["finish", "Acabado"]];
  return references.flatMap((reference) => {
    if (!reference.code.startsWith("01") || reference.branchCode !== "01" || reference.productType !== 1) return [];
    const profile = describeEanProduct(reference.description), agreements: string[] = [], checks: string[] = [];
    for (const [field, label] of fields) {
      const a = wanted[field], b = profile[field];
      const value = (v: unknown) => typeof v === "object" && v && "code" in v ? String(v.code) : v;
      if (field === "material" && a && b && a !== b && String(a).startsWith("STAINLESS") && String(b).startsWith("STAINLESS")
        && (a === "STAINLESS_UNSPECIFIED" || b === "STAINLESS_UNSPECIFIED")) { checks.push(label); continue; }
      if (a && b && value(a) !== value(b)) return [];
      if (a && b) agreements.push(label);
      else if (a) checks.push(label);
    }
    if (wanted.kind?.endsWith("VALVE")) checks.push("Norma, paso y fabricante");
    return [{ ...reference, agreements, checks: unique(checks) }];
  }).sort((a, b) => b.agreements.length - a.agreements.length || a.code.localeCompare(b.code)).slice(0, 6);
};
