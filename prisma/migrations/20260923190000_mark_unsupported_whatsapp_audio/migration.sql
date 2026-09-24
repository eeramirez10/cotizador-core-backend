ALTER TABLE "whatsapp_inbound_messages"
ADD COLUMN "has_unsupported_audio" BOOLEAN NOT NULL DEFAULT false;
