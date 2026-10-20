import { getQuoteItemFulfillment } from "./quote-item-fulfillment.helper";

interface UnquotedPurchaseCandidate {
  id: string;
  qty: number;
  stock: number | null;
  externalProductCode: string | null;
  product: { code: string | null; source?: "ERP" | "LOCAL_TEMP" } | null;
  sellerSupplierId: string | null;
}

export const erpCodeForQuoteItem = (item: Pick<UnquotedPurchaseCandidate, "externalProductCode" | "product">): string =>
  (item.externalProductCode || (item.product?.source === "ERP" ? item.product.code : null) || "").trim();

export const quotationOwnerForSupplierReference = (supplierId: string | null): "SELLER" | "PURCHASING" =>
  supplierId ? "SELLER" : "PURCHASING";

export const selectUnquotedPurchaseItems = <T extends UnquotedPurchaseCandidate>(items: T[], itemIds: string[]) => {
  const selectedIds = new Set(itemIds);
  const selected = items.flatMap((item, index) => selectedIds.has(item.id) ? [{ item, position: index + 1 }] : []);
  if (selected.length !== itemIds.length || selectedIds.size !== itemIds.length) {
    throw new Error("Las partidas seleccionadas no pertenecen a esta cotización o están repetidas.");
  }
  return selected.map(({ item, position }) => {
    if (item.sellerSupplierId) throw new Error(`La partida #${position} ya tiene proveedor de Ventas. Completa su requisición existente.`);
    const erpCode = erpCodeForQuoteItem(item);
    const fulfillment = getQuoteItemFulfillment({ qty: item.qty, stock: item.stock, externalProductCode: erpCode || null });
    if (!fulfillment.requiresPurchase) throw new Error(`La partida #${position} no requiere compra.`);
    return { item, position, erpCode, purchaseQty: fulfillment.purchaseQty };
  });
};
