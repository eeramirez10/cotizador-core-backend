import type { ErpDraftData } from "./purchase-item-erp-draft.validation";

const branchProfiles: Record<string, { account: string; salesProfile: string }> = {
  "01": { account: "1115001", salesProfile: "VG" },
  "02": { account: "1115002", salesProfile: "V2" },
  "03": { account: "1115003", salesProfile: "V3" },
  "04": { account: "1115004", salesProfile: "V4" },
  "05": { account: "1115005", salesProfile: "V5" },
  "06": { account: "1115006", salesProfile: "V6" },
  "07": { account: "1115008", salesProfile: "V7" },
};

export const erpDraftBranchDefaults = (branchCode: string): Pick<ErpDraftData,
  "primaryAccount" | "secondaryAccount" | "costAccount" | "salesProfile" | "purchaseProfile"> | null => {
  const profile = branchProfiles[branchCode.trim().padStart(2, "0")];
  if (!profile) return null;
  return {
    primaryAccount: profile.account,
    secondaryAccount: "4001001",
    costAccount: "5001001",
    salesProfile: profile.salesProfile,
    purchaseProfile: "CG",
  };
};
