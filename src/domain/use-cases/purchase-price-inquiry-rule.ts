import { validateSupplierOfferAllocations } from "./supplier-offer-allocation";

export const resolvePurchasePriceAwards = <T extends {
  id: string;
  qty: number;
  minimumQty: number | null;
  isActive: boolean;
  isSelected: boolean;
  awardedQty: number | null;
}>(position: number, itemQty: number, offers: T[]) => {
  const selected = offers.filter((offer) => offer.isSelected);
  if (!selected.length && offers.length !== 1) {
    throw new Error(`Selecciona una propuesta para la partida ${position}; hay ${offers.length} opciones activas.`);
  }
  const awards = selected.length
    ? selected.map((offer) => ({ offer, qty: offer.awardedQty ?? itemQty }))
    : [{ offer: offers[0], qty: itemQty }];
  validateSupplierOfferAllocations(itemQty, awards.map(({ offer, qty }) => ({ offerId: offer.id, qty })), offers);
  return { awards, autoSelected: selected.length === 0 };
};

export const canRequestPurchasingPrices = (status: string, captureMethod: string): boolean =>
  captureMethod !== "EXCEL_IMPORT" && (status === "DRAFT" || status === "APPROVED");

export const isPurchasingPriceReady = (items: Array<{
  qty: number;
  offers: Array<{ isSelected: boolean; awardedQty: number | null }>;
}>): boolean => items.length > 0 && items.every((item) =>
  item.offers.filter((offer) => offer.isSelected)
    .reduce((quantity, offer) => quantity + (offer.awardedQty ?? item.qty), 0) >= item.qty - 0.0001);

export const hasPendingPurchasingPrices = (requisitions: Array<{
  status: string;
  items: Array<Parameters<typeof isPurchasingPriceReady>[0][number] & { status?: string }>;
}>): boolean => requisitions.some((requisition) => {
  if (requisition.status === "DRAFT" || requisition.status === "CANCELLED") return false;
  const activeItems = requisition.items.filter((item) => item.status !== "CANCELLED");
  return activeItems.length > 0 && !isPurchasingPriceReady(activeItems);
});
