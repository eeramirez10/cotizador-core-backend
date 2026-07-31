ALTER TABLE "quote_items"
ADD COLUMN "customer_description_original" VARCHAR(500),
ADD COLUMN "customer_description_edited_at" TIMESTAMP(3),
ADD COLUMN "customer_description_edited_by_user_id" UUID;

UPDATE "quote_items"
SET "customer_description_original" = "customer_description"
WHERE "customer_description" IS NOT NULL;

CREATE INDEX "quote_items_customer_description_edited_by_user_id_idx"
ON "quote_items"("customer_description_edited_by_user_id");

ALTER TABLE "quote_items"
ADD CONSTRAINT "quote_items_customer_description_edited_by_user_id_fkey"
FOREIGN KEY ("customer_description_edited_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
