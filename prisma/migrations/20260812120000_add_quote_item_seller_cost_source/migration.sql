ALTER TYPE "PurchaseCostSource" ADD VALUE IF NOT EXISTS 'PRICE_LIST';

ALTER TABLE "quote_items"
ADD COLUMN IF NOT EXISTS "seller_cost_source" "PurchaseCostSource";
