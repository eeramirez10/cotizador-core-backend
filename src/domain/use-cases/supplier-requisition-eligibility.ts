interface SupplierRequisitionItem {
  source: "ERP_NO_STOCK" | "LOCAL_NEW";
  erpCode: string | null;
  status: string;
}

export const canIssueSupplierRequisitions = (
  status: string,
  items: SupplierRequisitionItem[],
  allowLocalWithoutErpCode: boolean,
): boolean => {
  if (!items.length) return false;
  const localReady = (item: SupplierRequisitionItem): boolean =>
    allowLocalWithoutErpCode
    && item.source === "LOCAL_NEW"
    && !item.erpCode?.trim()
    && item.status === "PENDING_ERP_CODE";
  if (!items.every((item) => item.status === "READY" || localReady(item))) return false;
  return status === "READY_FOR_ORDER"
    || status === "COMPLETED"
    || (status === "PARTIALLY_QUOTED" && items.some(localReady));
};
