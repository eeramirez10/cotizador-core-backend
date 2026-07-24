ALTER TABLE "suppliers"
ADD COLUMN "tax_id" VARCHAR(60),
ADD COLUMN "state" VARCHAR(120),
ADD COLUMN "credit_terms" VARCHAR(120),
ADD COLUMN "currency" "Currency",
ADD COLUMN "contact_position" VARCHAR(160),
ADD COLUMN "phone_extension" VARCHAR(30),
ADD COLUMN "mobile" VARCHAR(40),
ADD COLUMN "notes" TEXT,
ADD COLUMN "erp_synced_at" TIMESTAMP(3);

CREATE INDEX "suppliers_tax_id_idx" ON "suppliers"("tax_id");
