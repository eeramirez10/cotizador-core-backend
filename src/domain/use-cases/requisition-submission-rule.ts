import type { PurchaseOfferSource } from "../../infrastructure/database/generated/enums";

export interface RequisitionSubmissionItem {
  quotationOwner: PurchaseOfferSource;
  sellerUnitCost: number;
  sellerDeliveryTime: string | null;
  deliveryPlace: string | null;
}

export const requisitionSubmissionError = (items: RequisitionSubmissionItem[]): string | null => {
  if (items.length === 0) return "Purchase requisition must contain at least one item.";
  if (items.some((item) => !item.deliveryPlace?.trim())) return "Every item needs a delivery destination.";
  if (items.some((item) => item.quotationOwner === "SELLER" && (
    item.sellerUnitCost <= 0 || !item.sellerDeliveryTime?.trim()
  ))) return "Seller-quoted items need a positive cost and delivery time before submission.";
  return null;
};
