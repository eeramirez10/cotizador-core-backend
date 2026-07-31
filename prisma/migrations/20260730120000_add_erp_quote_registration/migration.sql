ALTER TABLE "quotes"
ADD COLUMN "erp_quote_number" VARCHAR(80),
ADD COLUMN "erp_quote_registered_at" TIMESTAMP(3),
ADD COLUMN "erp_quote_registered_by_user_id" UUID;

CREATE UNIQUE INDEX "quotes_erp_quote_number_key" ON "quotes"("erp_quote_number");
CREATE INDEX "quotes_erp_quote_registered_by_user_id_idx" ON "quotes"("erp_quote_registered_by_user_id");

ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_erp_quote_registered_by_user_id_fkey"
FOREIGN KEY ("erp_quote_registered_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
