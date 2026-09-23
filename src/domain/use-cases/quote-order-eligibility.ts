import type { QuoteItemEntity } from "../entities/quote-item.entity";

type OrderItem = Pick<QuoteItemEntity, "externalProductCode" | "product" | "qty" | "stock">;
type OrderCustomer = { source: "ERP" | "LOCAL"; code: string | null };

export const isCustomerEligibleForOrderFile = (customer: OrderCustomer | null, allowLocalCustomer: boolean): boolean => {
  if (!customer) return false;
  if (customer.source === "LOCAL") return allowLocalCustomer;
  return Boolean(customer.code?.trim());
};

export const getOrderItemErpCode = (item: Pick<OrderItem, "externalProductCode" | "product">): string =>
  item.externalProductCode?.trim() || item.product?.code?.trim() || "";

export const evaluateQuoteOrderItems = (items: OrderItem[], allowWithoutStock: boolean) => {
  const requiresPurchasing = items.some((item) => Math.max(0, item.stock ?? 0) < item.qty);
  return {
    missingErpCode: items.some((item) => !getOrderItemErpCode(item)),
    requiresPurchasing,
    requiresReadyRequisition: requiresPurchasing && !allowWithoutStock,
  };
};
