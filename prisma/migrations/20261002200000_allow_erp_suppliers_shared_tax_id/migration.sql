DROP INDEX IF EXISTS "suppliers_normalized_tax_id_key";

UPDATE "suppliers"
SET "normalized_tax_id" = NULLIF(REGEXP_REPLACE(UPPER("tax_id"), '[^A-Z0-9]', '', 'g'), '')
WHERE "source" = 'ERP' AND "normalized_tax_id" IS NULL AND "tax_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "suppliers_normalized_tax_id_idx"
ON "suppliers"("normalized_tax_id");

CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_local_normalized_tax_id_key"
ON "suppliers"("normalized_tax_id")
WHERE "source" = 'LOCAL' AND "normalized_tax_id" IS NOT NULL;
