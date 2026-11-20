// Descriptions are stored as TEXT. Codes and short labels retain their database limits.
export const quoteItemShortTextFields = {
  clientItemId: [80, "Identificador de la partida"],
  externalProductCode: [80, "Código ERP"],
  ean: [120, "EAN"],
  customerUnit: [30, "Unidad solicitada"],
  unit: [30, "Unidad"],
  deliveryTime: [80, "Plazo de entrega"],
  itemComment: [500, "Comentario"],
  sellerSupplierNameSnapshot: [220, "Nombre del proveedor"],
  sellerQuotedBrand: [160, "Marca del proveedor"],
  sellerSupplierProductCode: [120, "Código del proveedor"],
  sellerSupplierOrigin: [120, "Origen del proveedor"],
  sellerSupplierQuoteReference: [160, "Referencia de cotización del proveedor"],
  sellerDeliveryState: [120, "Estado de entrega"],
  sellerSupplierDeliveryTime: [120, "Plazo del proveedor"],
  purchaseStandard: [120, "Norma"],
  purchaseDiameter: [120, "Diámetro"],
  purchaseThickness: [120, "Espesor"],
  purchaseBore: [120, "Paso"],
  technicalFamily: [60, "Familia técnica"],
} as const;

export function validateQuoteItemTextFields(input: object): string | undefined {
  const values = input as Record<string, unknown>;
  for (const [field, [limit, label]] of Object.entries(quoteItemShortTextFields)) {
    const value = values[field];
    if (typeof value !== "string") continue;
    const normalized = field === "sellerSupplierProductCode" ? value.trim().toUpperCase() : value.trim();
    // PostgreSQL counts Unicode characters, not UTF-16 code units.
    const length = Array.from(normalized).length;
    if (length > limit) {
      return `${label} (${field}) admite hasta ${limit} caracteres; se recibieron ${length}.`;
    }
  }
  return undefined;
}

export class QuoteItemTextValidationError extends Error {}
