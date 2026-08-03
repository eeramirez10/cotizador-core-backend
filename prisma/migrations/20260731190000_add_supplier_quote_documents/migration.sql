CREATE TABLE "purchase_supplier_quotes" (
  "id" UUID NOT NULL,
  "requisition_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "file_asset_id" UUID,
  "source" "PurchaseOfferSource" NOT NULL DEFAULT 'PURCHASING',
  "reference" VARCHAR(120),
  "quote_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valid_until" DATE,
  "currency" "Currency" NOT NULL,
  "exchange_rate" DECIMAL(14,6),
  "payment_terms" VARCHAR(255),
  "delivery_terms" VARCHAR(255),
  "subtotal" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "discount" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "freight" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "other_charges" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "tax_included" BOOLEAN NOT NULL DEFAULT false,
  "tax_rate" DECIMAL(8,6) NOT NULL DEFAULT 0.16,
  "tax" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_supplier_quotes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "purchase_supplier_offers"
  ADD COLUMN "supplier_quote_id" UUID,
  ADD COLUMN "supplier_product_code" VARCHAR(120),
  ADD COLUMN "alternate_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "unit" VARCHAR(30),
  ADD COLUMN "list_unit_price" DECIMAL(14,4),
  ADD COLUMN "discount_pct" DECIMAL(8,4),
  ADD COLUMN "available_date" DATE,
  ADD COLUMN "minimum_qty" DECIMAL(14,4);

CREATE INDEX "purchase_supplier_quotes_requisition_id_created_at_idx" ON "purchase_supplier_quotes"("requisition_id", "created_at");
CREATE INDEX "purchase_supplier_quotes_supplier_id_idx" ON "purchase_supplier_quotes"("supplier_id");
CREATE INDEX "purchase_supplier_quotes_file_asset_id_idx" ON "purchase_supplier_quotes"("file_asset_id");
CREATE INDEX "purchase_supplier_offers_supplier_quote_id_idx" ON "purchase_supplier_offers"("supplier_quote_id");

ALTER TABLE "purchase_supplier_quotes" ADD CONSTRAINT "purchase_supplier_quotes_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_supplier_quotes" ADD CONSTRAINT "purchase_supplier_quotes_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_supplier_quotes" ADD CONSTRAINT "purchase_supplier_quotes_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_supplier_quotes" ADD CONSTRAINT "purchase_supplier_quotes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_supplier_quotes" ADD CONSTRAINT "purchase_supplier_quotes_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_supplier_offers" ADD CONSTRAINT "purchase_supplier_offers_supplier_quote_id_fkey" FOREIGN KEY ("supplier_quote_id") REFERENCES "purchase_supplier_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
