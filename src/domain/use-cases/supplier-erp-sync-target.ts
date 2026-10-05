export interface SupplierSyncIdentity {
  id: string;
  erpCode: string | null;
}

export const resolveSupplierErpSyncTarget = <T extends SupplierSyncIdentity>(
  existingByCode: T | null,
  taxIdMatches: T[],
): T | null => {
  return existingByCode || taxIdMatches.find((supplier) => supplier.erpCode === null) || null;
};
