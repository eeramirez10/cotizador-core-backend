ALTER TYPE "QuoteAttachmentCategory" ADD VALUE IF NOT EXISTS 'CUSTOMER_QUOTE_PDF';
ALTER TYPE "QuoteDeliveryAttemptStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "QuoteDeliveryAttemptStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "QuoteDeliveryAttemptStatus" ADD VALUE IF NOT EXISTS 'READ';

ALTER TABLE "quote_delivery_attempts"
  ADD COLUMN "file_asset_id" UUID,
  ADD COLUMN "customer_contact_id" UUID,
  ADD COLUMN "template_sid" VARCHAR(160),
  ADD COLUMN "delivered_at" TIMESTAMP(3),
  ADD COLUMN "read_at" TIMESTAMP(3),
  ADD COLUMN "failed_at" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "quote_delivery_attempts"
  ADD CONSTRAINT "quote_delivery_attempts_file_asset_id_fkey"
  FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quote_delivery_attempts"
  ADD CONSTRAINT "quote_delivery_attempts_customer_contact_id_fkey"
  FOREIGN KEY ("customer_contact_id") REFERENCES "customer_contacts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "quote_delivery_attempts_provider_message_id_idx"
  ON "quote_delivery_attempts"("provider_message_id");
CREATE INDEX "quote_delivery_attempts_file_asset_id_idx"
  ON "quote_delivery_attempts"("file_asset_id");
CREATE INDEX "quote_delivery_attempts_customer_contact_id_idx"
  ON "quote_delivery_attempts"("customer_contact_id");
