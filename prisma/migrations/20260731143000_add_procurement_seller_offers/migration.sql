CREATE TYPE "SupplierStatus" AS ENUM ('PROSPECT', 'PENDING_ERP', 'ERP_SYNCED');
CREATE TYPE "PurchaseOfferSource" AS ENUM ('SELLER', 'PURCHASING');

ALTER TABLE "quote_items"
ADD COLUMN "seller_supplier_description" VARCHAR(500),
ADD COLUMN "technical_family" VARCHAR(60),
ADD COLUMN "technical_attributes" JSONB;

ALTER TABLE "suppliers"
ADD COLUMN "status" "SupplierStatus" NOT NULL DEFAULT 'PROSPECT',
ADD COLUMN "normalized_tax_id" VARCHAR(60),
ADD COLUMN "normalized_email" VARCHAR(160),
ADD COLUMN "normalized_phone" VARCHAR(40);

UPDATE "suppliers"
SET
  "normalized_tax_id" = NULLIF(REGEXP_REPLACE(UPPER(COALESCE("tax_id", '')), '[^A-Z0-9]', '', 'g'), ''),
  "normalized_email" = NULLIF(LOWER(TRIM(COALESCE("email", ''))), ''),
  "normalized_phone" = NULLIF(REGEXP_REPLACE(COALESCE("phone", ''), '[^0-9]', '', 'g'), ''),
  "status" = CASE WHEN "source" = 'ERP' THEN 'ERP_SYNCED'::"SupplierStatus" ELSE 'PROSPECT'::"SupplierStatus" END;

WITH ranked_tax_ids AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "normalized_tax_id" ORDER BY "created_at") AS row_number
  FROM "suppliers"
  WHERE "normalized_tax_id" IS NOT NULL
)
UPDATE "suppliers"
SET "normalized_tax_id" = NULL
WHERE "id" IN (SELECT "id" FROM ranked_tax_ids WHERE row_number > 1);

CREATE UNIQUE INDEX "suppliers_normalized_tax_id_key" ON "suppliers"("normalized_tax_id");
CREATE INDEX "suppliers_normalized_email_idx" ON "suppliers"("normalized_email");
CREATE INDEX "suppliers_normalized_phone_idx" ON "suppliers"("normalized_phone");

ALTER TABLE "purchase_requisition_items"
ADD COLUMN "technical_family" VARCHAR(60),
ADD COLUMN "technical_attributes" JSONB;

ALTER TABLE "purchase_supplier_offers"
ADD COLUMN "source" "PurchaseOfferSource" NOT NULL DEFAULT 'PURCHASING',
ADD COLUMN "supplier_description" VARCHAR(500);
