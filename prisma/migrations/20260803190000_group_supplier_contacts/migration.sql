ALTER TABLE "supplier_contacts"
ADD COLUMN "contact_key" VARCHAR(60),
ADD COLUMN "contact_position" VARCHAR(160);

UPDATE "supplier_contacts"
SET "contact_key" = 'legacy-' || "id"::text;

ALTER TABLE "supplier_contacts"
ALTER COLUMN "contact_key" SET NOT NULL;

CREATE INDEX "supplier_contacts_supplier_id_contact_key_idx"
ON "supplier_contacts"("supplier_id", "contact_key");
