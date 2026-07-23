ALTER TABLE "quote_items"
  ADD COLUMN IF NOT EXISTS "source_currency" "Currency",
  ADD COLUMN IF NOT EXISTS "source_unit_price" DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS "source_subtotal" DECIMAL(14,4);
