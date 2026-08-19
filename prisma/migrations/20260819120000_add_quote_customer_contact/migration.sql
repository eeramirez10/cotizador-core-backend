ALTER TABLE "quotes"
ADD COLUMN "customer_contact_id" UUID;

CREATE INDEX "quotes_customer_contact_id_idx"
ON "quotes"("customer_contact_id");

ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_customer_contact_id_fkey"
FOREIGN KEY ("customer_contact_id") REFERENCES "customer_contacts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
