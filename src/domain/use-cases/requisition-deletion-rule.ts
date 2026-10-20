export const assertRequisitionCanBeDeleted = (input: {
  confirmation: string;
  requisitionNumber: string;
  status: string;
  erpOrderNumber: string | null;
  orderStatus: string;
  hasOrderExport: boolean;
}): void => {
  if (input.confirmation !== input.requisitionNumber) {
    throw new Error("Requisition number confirmation does not match.");
  }
  if (input.status === "COMPLETED" || input.erpOrderNumber || input.orderStatus === "GENERATED" || input.hasOrderExport) {
    throw new Error("A requisition linked to an ERP order or generated order file cannot be deleted.");
  }
};
