ALTER TABLE "quote_items" ADD COLUMN "sale_price_review_required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quote_items" ADD COLUMN "purchase_suggested_unit_price" DECIMAL(14,4);
