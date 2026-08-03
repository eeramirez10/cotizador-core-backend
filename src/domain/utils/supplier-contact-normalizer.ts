import {
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

const COUNTRY_ALIASES: Record<string, CountryCode> = {
  MEXICO: "MX",
  MX: "MX",
  "ESTADOS UNIDOS": "US",
  USA: "US",
  US: "US",
  CANADA: "CA",
  CA: "CA",
  CHINA: "CN",
  CN: "CN",
  TURQUIA: "TR",
  TURKEY: "TR",
  TR: "TR",
  ESPANA: "ES",
  SPAIN: "ES",
  ES: "ES",
  ALEMANIA: "DE",
  GERMANY: "DE",
  DE: "DE",
  ITALIA: "IT",
  ITALY: "IT",
  IT: "IT",
  INDIA: "IN",
  IN: "IN",
  BRASIL: "BR",
  BRAZIL: "BR",
  BR: "BR",
  JAPON: "JP",
  JAPAN: "JP",
  JP: "JP",
  "COREA DEL SUR": "KR",
  "SOUTH KOREA": "KR",
  KR: "KR",
  "REINO UNIDO": "GB",
  "UNITED KINGDOM": "GB",
  UK: "GB",
  GB: "GB",
};

const canonicalCountry = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

export const supplierCountryCode = (country: string | null): CountryCode | undefined => {
  if (!country) return undefined;
  const canonical = canonicalCountry(country);
  const aliased = COUNTRY_ALIASES[canonical];
  if (aliased) return aliased;
  return canonical.length === 2 && isSupportedCountry(canonical as CountryCode)
    ? canonical as CountryCode
    : undefined;
};

export const normalizeSupplierEmail = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254 || /\s/.test(normalized)) return null;
  const parts = normalized.split("@");
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (!local || !domain || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  if (!/^[a-z0-9.!#$%&'*+/=?^_\`{|}~-]+$/i.test(local)) return null;
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(domain)) return null;
  return normalized;
};

export interface NormalizedSupplierPhone {
  e164: string;
  extension: string | null;
}

export const normalizeSupplierPhone = (
  value: string,
  country: string | null,
  explicitExtension?: string | null,
): NormalizedSupplierPhone | null => {
  const defaultCountry = supplierCountryCode(country);
  const parsed = parsePhoneNumberFromString(value.trim(), defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  const extension = (explicitExtension || parsed.ext || "").replace(/\D/g, "").slice(0, 10) || null;
  return { e164: parsed.number, extension };
};
