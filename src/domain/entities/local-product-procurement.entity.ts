import type {
  Currency,
  ProductCostSource,
  ProductCostStatus,
  ProductProcurementStatus,
} from "../../infrastructure/database/generated/enums";

export interface ProcurementUserSummary {
  id: string;
  fullName: string;
}

export interface LocalProductProcurementOfferEntity {
  id: string;
  productId: string;
  supplierName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  unitCost: number;
  currency: Currency;
  minimumQty: number | null;
  deliveryTime: string | null;
  validUntil: Date | null;
  notes: string | null;
  isSelected: boolean;
  isActive: boolean;
  createdBy: ProcurementUserSummary;
  updatedBy: ProcurementUserSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalProductProcurementEntity {
  id: string;
  description: string;
  commercialDescription: string | null;
  family: string | null;
  subfamily: string | null;
  brand: string | null;
  technicalAttributes: Record<string, string>;
  unit: string;
  currency: Currency;
  averageCost: number | null;
  lastCost: number | null;
  costStatus: ProductCostStatus;
  costSource: ProductCostSource | null;
  branch: {
    id: string;
    code: string;
    name: string;
  } | null;
  createdBy: ProcurementUserSummary | null;
  procurementStatus: ProductProcurementStatus;
  procurementNotes: string | null;
  procurementUpdatedAt: Date | null;
  procurementUpdatedBy: ProcurementUserSummary | null;
  selectedProcurementOfferId: string | null;
  offers: LocalProductProcurementOfferEntity[];
  createdAt: Date;
  updatedAt: Date;
}
