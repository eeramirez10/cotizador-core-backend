import type { SupplierOfferAllocation } from "../datasources/purchase-requisition.datasource";

export const supplierRequisitionGroupKey = (supplierId: string, currency: "MXN" | "USD") => `${supplierId}:${currency}`;

const units = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0 || Math.round(value * 10_000) !== value * 10_000) {
    throw new Error("Each awarded quantity must be positive with at most four decimals.");
  }
  return Math.round(value * 10_000);
};

export function validateSupplierOfferAllocations(
  itemQty: number,
  allocations: SupplierOfferAllocation[],
  offers: Array<{ id: string; qty: number; isActive: boolean; minimumQty: number | null }>,
): void {
  if (!allocations.length) throw new Error("Select at least one supplier offer.");
  const seen = new Set<string>();
  let total = 0;
  for (const allocation of allocations) {
    const offer = offers.find((candidate) => candidate.id === allocation.offerId);
    if (!offer?.isActive || seen.has(allocation.offerId)) throw new Error("Selected supplier offer is invalid or duplicated.");
    seen.add(allocation.offerId);
    const qty = units(allocation.qty);
    if (qty > units(offer.qty)) throw new Error("Awarded quantity exceeds the supplier offer quantity.");
    if (offer.minimumQty !== null && qty < units(offer.minimumQty)) throw new Error("Awarded quantity is below the supplier minimum.");
    total += qty;
  }
  if (total !== units(itemQty)) throw new Error("Awarded quantities must equal the requisition item quantity.");
}
