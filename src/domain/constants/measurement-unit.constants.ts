export const ALLOWED_MEASUREMENT_UNITS = [
  "PZ",
  "K",
  "M",
  "L",
  "TR",
  "SE",
  "ACT",
  "FT",
  "XRO",
  "UNO",
  "M2",
  "LOT",
  "CON",
] as const;

export type MeasurementUnit = (typeof ALLOWED_MEASUREMENT_UNITS)[number];

export const DEFAULT_MEASUREMENT_UNIT: MeasurementUnit = "PZ";

const UNIT_ALIASES = new Map<string, MeasurementUnit>([
  ["PZ", "PZ"], ["PZA", "PZ"], ["PZAS", "PZ"], ["PIEZA", "PZ"], ["PIEZAS", "PZ"],
  ["PC", "PZ"], ["PCS", "PZ"], ["PIECE", "PZ"], ["PIECES", "PZ"],
  ["K", "K"], ["KG", "K"], ["KGS", "K"], ["KILO", "K"], ["KILOS", "K"],
  ["KILOGRAMO", "K"], ["KILOGRAMOS", "K"], ["KILOGRAM", "K"], ["KILOGRAMS", "K"],
  ["M", "M"], ["MT", "M"], ["MTS", "M"], ["MTR", "M"], ["MTRS", "M"],
  ["METRO", "M"], ["METROS", "M"], ["METRO LINEAL", "M"], ["METROS LINEALES", "M"],
  ["L", "L"], ["LT", "L"], ["LTS", "L"], ["LTR", "L"], ["LITRO", "L"], ["LITROS", "L"],
  ["TR", "TR"], ["TMO", "TR"], ["TMOS", "TR"], ["TRAMO", "TR"], ["TRAMOS", "TR"],
  ["SE", "SE"], ["SERV", "SE"], ["SERVICIO", "SE"], ["SERVICIOS", "SE"], ["SERVICE", "SE"],
  ["ACT", "ACT"], ["ACTIVIDAD", "ACT"], ["ACTIVIDADES", "ACT"], ["ACTIVITY", "ACT"],
  ["FT", "FT"], ["FTS", "FT"], ["PIE", "FT"], ["PIES", "FT"], ["FOOT", "FT"], ["FEET", "FT"],
  ["XRO", "XRO"], ["RLL", "XRO"], ["RLLS", "XRO"], ["ROLLO", "XRO"], ["ROLLOS", "XRO"], ["ROLL", "XRO"],
  ["UNO", "UNO"], ["UN", "UNO"], ["UND", "UNO"], ["UNID", "UNO"], ["UNIDAD", "UNO"],
  ["UNIDADES", "UNO"], ["EA", "UNO"], ["EACH", "UNO"],
  ["M2", "M2"], ["MT2", "M2"], ["MTS2", "M2"], ["METRO CUADRADO", "M2"],
  ["METROS CUADRADOS", "M2"], ["SQM", "M2"],
  ["LOT", "LOT"], ["LOTE", "LOT"], ["LOTES", "LOT"],
  ["CON", "CON"], ["CONJ", "CON"], ["CONJUNTO", "CON"], ["CONJUNTOS", "CON"],
  ["JGO", "CON"], ["JUEGO", "CON"], ["JUEGOS", "CON"], ["SET", "CON"], ["SETS", "CON"],
]);

export const normalizeMeasurementUnit = (value: unknown): MeasurementUnit | null => {
  if (typeof value !== "string") return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/²/g, "2")
    .replace(/\^2/g, "2")
    .trim()
    .toUpperCase()
    .replace(/[.,;:()"'`]/g, "")
    .replace(/[\/_-]+/g, " ")
    .replace(/\s+/g, " ");
  return UNIT_ALIASES.get(normalized) ?? UNIT_ALIASES.get(normalized.replace(/\s+/g, "")) ?? null;
};

export const isAllowedMeasurementUnit = (value: string): value is MeasurementUnit => {
  return ALLOWED_MEASUREMENT_UNITS.includes(value as MeasurementUnit);
};
