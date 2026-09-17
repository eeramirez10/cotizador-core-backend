CREATE TABLE "whatsapp_inbound_attachments" (
  "id" UUID NOT NULL,
  "inbound_message_id" UUID NOT NULL,
  "provider_media_url" VARCHAR(1000) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "storage_key" VARCHAR(500) NOT NULL,
  "mime_type" VARCHAR(120) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "checksum_sha256" CHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_inbound_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_inbound_attachments_provider_media_url_key"
  ON "whatsapp_inbound_attachments"("provider_media_url");
CREATE UNIQUE INDEX "whatsapp_inbound_attachments_storage_key_key"
  ON "whatsapp_inbound_attachments"("storage_key");
CREATE INDEX "whatsapp_inbound_attachments_inbound_message_id_created_at_idx"
  ON "whatsapp_inbound_attachments"("inbound_message_id", "created_at");

ALTER TABLE "whatsapp_inbound_attachments"
  ADD CONSTRAINT "whatsapp_inbound_attachments_inbound_message_id_fkey"
  FOREIGN KEY ("inbound_message_id") REFERENCES "whatsapp_inbound_messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
