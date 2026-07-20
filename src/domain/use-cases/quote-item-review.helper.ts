interface QuoteItemReviewInput {
  productId?: string | null;
  externalProductCode?: string | null;
  ean?: string | null;
  erpDescription?: string | null;
  qty: number;
  unit: string;
  customerDescription?: string | null;
  unitPrice?: number;
  deliveryTime?: string | null;
}

const hasText = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

export const isQuoteItemReady = (input: QuoteItemReviewInput): boolean => {
  const hasIdentifier = hasText(input.productId) || hasText(input.externalProductCode) || hasText(input.ean);
  const hasErpDescription = hasText(input.erpDescription);
  const hasValidQty = Number.isFinite(input.qty) && input.qty > 0;
  const hasValidUnit = hasText(input.unit);

  return hasIdentifier && hasErpDescription && hasValidQty && hasValidUnit;
};

export const isImportedExcelItemReady = (input: QuoteItemReviewInput): boolean => {
  const hasDescription = hasText(input.customerDescription) || hasText(input.erpDescription);
  const hasValidQty = Number.isFinite(input.qty) && input.qty > 0;
  const hasValidUnit = hasText(input.unit);
  const hasValidPrice = Number.isFinite(input.unitPrice) && Number(input.unitPrice) > 0;
  const hasDeliveryTime = hasText(input.deliveryTime);

  return hasDescription && hasValidQty && hasValidUnit && hasValidPrice && hasDeliveryTime;
};
