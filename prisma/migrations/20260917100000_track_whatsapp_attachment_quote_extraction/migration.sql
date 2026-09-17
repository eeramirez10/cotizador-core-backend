ALTER TABLE "whatsapp_inbound_attachments"
  ADD COLUMN "quote_extracted_at" TIMESTAMP(3),
  ADD COLUMN "quote_extraction_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "quote_extracted_by_user_id" UUID,
  ADD COLUMN "quote_extracted_by_name" VARCHAR(241),
  ADD COLUMN "last_quote_draft_id" UUID;
