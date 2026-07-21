import type { Currency } from "../../infrastructure/database/generated/enums";

export const convertQuoteAmount = (
  amount: number,
  sourceCurrency: Currency,
  targetCurrency: Currency,
  exchangeRate: number
): number => {
  if (sourceCurrency === targetCurrency) return amount;
  const safeRate = exchangeRate > 0 ? exchangeRate : 1;
  return sourceCurrency === "USD" ? amount * safeRate : amount / safeRate;
};
