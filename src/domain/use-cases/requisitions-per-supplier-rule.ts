export const groupRequisitionItemsBySupplier = <T extends { sellerSupplierId: string | null }>(items: T[]): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    if (!item.sellerSupplierId) continue;
    groups.set(item.sellerSupplierId, [...(groups.get(item.sellerSupplierId) || []), item]);
  }
  return groups;
};

export const areSupplierRequisitionsReadyForOrder = (
  requiredQuoteItemIds: string[],
  requisitions: Array<{ status: string; items: Array<{ quoteItemId: string; status: string }> }>,
  internalApprovalEnabled: boolean,
): boolean => {
  if (requisitions.length === 0) return false;
  const coveredIds = new Set(requisitions.flatMap((requisition) => requisition.items.map((item) => item.quoteItemId)));
  return requiredQuoteItemIds.every((id) => coveredIds.has(id)) && requisitions.every((requisition) =>
    (["READY_FOR_ORDER", "COMPLETED"].includes(requisition.status)
      || (!internalApprovalEnabled && requisition.status === "COST_REVIEW"))
    && requisition.items.every((item) => item.status === "READY"));
};
