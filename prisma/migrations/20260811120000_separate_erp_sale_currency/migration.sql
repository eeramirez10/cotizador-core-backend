ALTER TABLE "quote_items"
  ADD COLUMN "erp_sale_currency" "Currency";

UPDATE "quote_items"
SET
  "erp_sale_currency" = "cost_currency",
  "cost_currency" = 'MXN'
WHERE "external_product_code" IS NOT NULL
  AND BTRIM("external_product_code") <> '';
