import type { ErpDraftData } from "./purchase-item-erp-draft.validation";

interface LocalItemReference {
  description: string;
  productDescription?: string | null;
  customerDescription?: string | null;
  technicalAttributes?: Record<string, string>;
  unit: string;
  erpEan: string | null;
}

interface SupplierOfferReference {
  currency: "MXN" | "USD";
}

const optionalText = (value: string | null, max: number): string | undefined =>
  value?.trim().slice(0, max) || undefined;

export const erpDraftDefaultsFromOffer = (item: LocalItemReference, offer: SupplierOfferReference): ErpDraftData => ({
  description: (item.productDescription?.trim() || item.description.trim()).slice(0, 60),
  extendedDescription: [...new Set([item.customerDescription, item.productDescription, item.description, ...Object.values(item.technicalAttributes ?? {})].flatMap(value => value?.trim() ? [value.trim()] : []))].join("\n").slice(0, 4800),
  productType: 1,
  unitCode: item.unit.trim().slice(0, 30),
  ...(optionalText(item.erpEan, 120) ? { ean: optionalText(item.erpEan, 120) } : {}),
  erpCurrency: offer.currency === "USD" ? 2 : 1,
  ivaType: 0,
});

export const mergeSelectedOfferIntoErpDraft = (
  item: LocalItemReference,
  offer: SupplierOfferReference,
  saved?: ErpDraftData,
  previousOffer?: SupplierOfferReference,
): ErpDraftData => {
  const selectedDefaults = erpDraftDefaultsFromOffer(item, offer);
  if (!saved) return selectedDefaults;

  const result: ErpDraftData = { ...selectedDefaults, ...saved };
  const previousDefaults = previousOffer ? erpDraftDefaultsFromOffer(item, previousOffer) : undefined;
  const supplierFields = ["erpCurrency"] as const;
  for (const field of supplierFields) {
    if (saved[field] === undefined || (previousDefaults && saved[field] === previousDefaults[field])) {
      const value = selectedDefaults[field];
      if (value === undefined) delete result[field];
      else result[field] = value;
    }
  }
  return result;
};
