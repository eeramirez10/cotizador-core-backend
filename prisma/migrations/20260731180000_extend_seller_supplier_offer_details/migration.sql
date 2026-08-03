ALTER TABLE "quote_items"
ADD COLUMN "seller_quoted_exchange_rate" DECIMAL(14, 6),
ADD COLUMN "seller_supplier_origin" VARCHAR(120),
ADD COLUMN "seller_supplier_quote_valid_until" DATE,
ADD COLUMN "seller_supplier_quote_reference" VARCHAR(160),
ADD COLUMN "seller_supplier_quote_notes" TEXT;
