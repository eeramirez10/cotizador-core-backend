export const ALLOWED_MEASUREMENT_UNITS = [
  "PZA",
  "M",
  "FT",
  "KG",
  "TR",
  "SE",
  "MPZ",
  "LB",
  "CM",
  "MM",
  "IN",
  "GAL",
  "L",
] as const;

export type MeasurementUnit = (typeof ALLOWED_MEASUREMENT_UNITS)[number];

export const DEFAULT_MEASUREMENT_UNIT: MeasurementUnit = "PZA";

export const isAllowedMeasurementUnit = (value: string): value is MeasurementUnit => {
  return ALLOWED_MEASUREMENT_UNITS.includes(value as MeasurementUnit);
};
