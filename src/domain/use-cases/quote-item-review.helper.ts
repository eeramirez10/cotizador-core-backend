interface QuoteItemReviewInput {
  productId?: string | null;
  externalProductCode?: string | null;
  ean?: string | null;
  erpDescription?: string | null;
  qty: number;
  unit: string;
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
