export interface ManagerReportSellerRow {
  userId: string;
  name: string;
  quotes: number;
  approved: number;
  conversionRate: number;
  quotedMxn: number;
  quotedUsd: number;
  approvedMxn: number;
  approvedUsd: number;
}

export interface ManagerReportSnapshot {
  scopeName: string;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  totals: {
    created: number;
    quoted: number;
    approved: number;
    pending: number;
    ordersGenerated: number;
    quotedMxn: number;
    quotedUsd: number;
    approvedMxn: number;
    approvedUsd: number;
  };
  sellers: ManagerReportSellerRow[];
}

export abstract class ManagerReportPdfPort {
  abstract create(snapshot: ManagerReportSnapshot): Buffer;
}
