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
  sourceRequiresReview?: boolean;
}

const hasText = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

export const getQuoteItemReviewIssues = (
  input: QuoteItemReviewInput,
  importedFromExcel = false
): string[] => {
  const issues: string[] = [];

  if (importedFromExcel) {
    if (input.sourceRequiresReview) issues.push("extracted data pending confirmation");
    if (!hasText(input.customerDescription) && !hasText(input.erpDescription)) {
      issues.push("missing description");
    }
    if (!Number.isFinite(input.qty) || input.qty <= 0) issues.push("quantity must be greater than zero");
    if (!hasText(input.unit)) issues.push("missing measurement unit");
    if (!Number.isFinite(input.unitPrice) || Number(input.unitPrice) <= 0) issues.push("missing seller price");
    if (!hasText(input.deliveryTime)) issues.push("missing delivery time");
    return issues;
  }

  const hasLocalProduct = hasText(input.productId);
  const hasErpProduct = !hasLocalProduct && (hasText(input.externalProductCode) || hasText(input.ean));
  if (!hasLocalProduct && !hasErpProduct) issues.push("missing ERP or local product link");
  if (hasErpProduct && !hasText(input.erpDescription)) issues.push("missing ERP product description");
  if (hasLocalProduct && !hasText(input.customerDescription) && !hasText(input.erpDescription)) {
    issues.push("missing local product description");
  }
  if (!Number.isFinite(input.qty) || input.qty <= 0) issues.push("quantity must be greater than zero");
  if (!hasText(input.unit)) issues.push("missing measurement unit");

  return issues;
};

export const isQuoteItemReady = (input: QuoteItemReviewInput): boolean =>
  getQuoteItemReviewIssues(input).length === 0;

export const isImportedExcelItemReady = (input: QuoteItemReviewInput): boolean => {
  return getQuoteItemReviewIssues(input, true).length === 0;
};

export const formatQuoteItemReviewError = (
  items: QuoteItemReviewInput[],
  importedFromExcel: boolean,
  prefix: string
): string => {
  const details = items
    .map((item, index) => {
      const issues = getQuoteItemReviewIssues(item, importedFromExcel);
      return issues.length > 0 ? `item ${index + 1}: ${issues.join(", ")}` : null;
    })
    .filter((detail): detail is string => detail !== null);

  return `${prefix}: ${details.join("; ")}.`;
};
