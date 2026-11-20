-- Preserve full descriptions, including the original customer request and purchasing snapshots.
-- This only widens existing columns; it does not delete, truncate or rewrite their values.
ALTER TABLE "quote_items"
  ALTER COLUMN "customer_description" TYPE TEXT,
  ALTER COLUMN "customer_description_original" TYPE TEXT,
  ALTER COLUMN "erp_description" TYPE TEXT,
  ALTER COLUMN "seller_supplier_description" TYPE TEXT;

ALTER TABLE "purchase_requisition_items"
  ALTER COLUMN "description" TYPE TEXT;

ALTER TABLE "purchase_supplier_offers"
  ALTER COLUMN "supplier_description" TYPE TEXT;

ALTER TABLE "purchase_supplier_requisition_lines"
  ALTER COLUMN "description" TYPE TEXT;
