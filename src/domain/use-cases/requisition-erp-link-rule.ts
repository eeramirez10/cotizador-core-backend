import { normalizeMeasurementUnit } from "../constants/measurement-unit.constants";

export class RequisitionErpLinkError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function assertRequisitionErpLinkAllowed(input: {
  quoteStatus: string;
  quoteLocked?: boolean;
  requisitionStatus: string;
  itemStatus: string;
  source: string;
  erpCode: string | null;
  issued: boolean;
  issuedLineCodes?: Array<string | null>;
}) {
  if (input.quoteStatus !== "APPROVED" || input.quoteLocked) {
    throw new RequisitionErpLinkError("La cotización debe estar aprobada, vigente y sin pedido generado.", 409);
  }
  if (["COMPLETED", "CANCELLED"].includes(input.requisitionStatus)
    || input.itemStatus === "CANCELLED" || input.source !== "LOCAL_NEW") {
    throw new RequisitionErpLinkError("La partida no admite un alta ERP.", 409);
  }
  if (input.issued && (input.erpCode?.trim() || input.issuedLineCodes?.some(code => code?.trim()))) {
    throw new RequisitionErpLinkError("El documento de proveedor ya fue emitido. Solo se puede completar un código faltante.", 409);
  }
}

export const erpUnitsMatch = (localUnit: string, erpUnit: string): boolean => {
  const normalize = (unit: string) => normalizeMeasurementUnit(unit) ?? unit.trim().toUpperCase();
  return Boolean(localUnit.trim() && erpUnit.trim() && normalize(localUnit) === normalize(erpUnit));
};
