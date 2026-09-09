CREATE TABLE "whatsapp_conversations" (
  "id" UUID NOT NULL,
  "business_phone_e164" VARCHAR(20) NOT NULL,
  "participant_phone_e164" VARCHAR(20) NOT NULL,
  "last_inbound_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_inbound_messages" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "provider_message_id" VARCHAR(160) NOT NULL,
  "body" TEXT,
  "media_count" INTEGER NOT NULL DEFAULT 0,
  "received_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "whatsapp_inbound_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_conversations_business_participant_key"
  ON "whatsapp_conversations"("business_phone_e164", "participant_phone_e164");
CREATE INDEX "whatsapp_conversations_last_inbound_at_idx"
  ON "whatsapp_conversations"("last_inbound_at");
CREATE UNIQUE INDEX "whatsapp_inbound_messages_provider_message_id_key"
  ON "whatsapp_inbound_messages"("provider_message_id");
CREATE INDEX "whatsapp_inbound_messages_conversation_id_received_at_idx"
  ON "whatsapp_inbound_messages"("conversation_id", "received_at");

ALTER TABLE "whatsapp_inbound_messages"
  ADD CONSTRAINT "whatsapp_inbound_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
