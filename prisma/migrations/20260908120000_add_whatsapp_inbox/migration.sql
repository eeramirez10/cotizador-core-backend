ALTER TYPE "WhatsAppAssistantJobStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "WhatsAppConversationMode" AS ENUM ('AI', 'HUMAN');
CREATE TYPE "WhatsAppOutboundAuthorType" AS ENUM ('AI', 'USER', 'SYSTEM');
CREATE TYPE "WhatsAppOutboundMessageType" AS ENUM ('TEXT', 'QUOTE_DOCUMENT');
CREATE TYPE "WhatsAppOutboundMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

ALTER TABLE "whatsapp_conversations"
  ALTER COLUMN "last_inbound_at" DROP NOT NULL,
  ADD COLUMN "mode" "WhatsAppConversationMode" NOT NULL DEFAULT 'AI',
  ADD COLUMN "handled_by_user_id" UUID,
  ADD COLUMN "handled_at" TIMESTAMP(3),
  ADD COLUMN "last_message_at" TIMESTAMP(3);

UPDATE "whatsapp_conversations" AS conversation
SET "last_message_at" = GREATEST(
  COALESCE(conversation."last_inbound_at", conversation."created_at"),
  COALESCE((
    SELECT MAX(message."sent_at")
    FROM "whatsapp_outbound_messages" AS message
    WHERE message."conversation_id" = conversation."id"
  ), conversation."created_at")
);

ALTER TABLE "whatsapp_conversations"
  ALTER COLUMN "last_message_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "last_message_at" SET NOT NULL;

ALTER TABLE "whatsapp_outbound_messages"
  ADD COLUMN "author_type" "WhatsAppOutboundAuthorType" NOT NULL DEFAULT 'AI',
  ADD COLUMN "message_type" "WhatsAppOutboundMessageType" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "status" "WhatsAppOutboundMessageStatus" NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN "sent_by_user_id" UUID,
  ADD COLUMN "quote_id" UUID,
  ADD COLUMN "file_asset_id" UUID,
  ADD COLUMN "error_message" TEXT,
  ADD COLUMN "delivered_at" TIMESTAMP(3),
  ADD COLUMN "read_at" TIMESTAMP(3),
  ADD COLUMN "failed_at" TIMESTAMP(3);

CREATE TABLE "whatsapp_conversation_accesses" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "customer_id" UUID,
  "customer_contact_id" UUID,
  "quote_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_conversation_accesses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_conversation_read_states" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "last_read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_conversation_read_states_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_conversations_last_message_at_idx"
  ON "whatsapp_conversations"("last_message_at");
CREATE INDEX "whatsapp_conversations_handled_by_user_id_idx"
  ON "whatsapp_conversations"("handled_by_user_id");
CREATE UNIQUE INDEX "whatsapp_conversation_accesses_conversation_id_user_id_key"
  ON "whatsapp_conversation_accesses"("conversation_id", "user_id");
CREATE INDEX "whatsapp_conversation_accesses_user_id_updated_at_idx"
  ON "whatsapp_conversation_accesses"("user_id", "updated_at");
CREATE INDEX "whatsapp_conversation_accesses_branch_id_updated_at_idx"
  ON "whatsapp_conversation_accesses"("branch_id", "updated_at");
CREATE INDEX "whatsapp_conversation_accesses_customer_id_idx"
  ON "whatsapp_conversation_accesses"("customer_id");
CREATE INDEX "whatsapp_conversation_accesses_customer_contact_id_idx"
  ON "whatsapp_conversation_accesses"("customer_contact_id");
CREATE INDEX "whatsapp_conversation_accesses_quote_id_idx"
  ON "whatsapp_conversation_accesses"("quote_id");
CREATE UNIQUE INDEX "whatsapp_conversation_read_states_conversation_id_user_id_key"
  ON "whatsapp_conversation_read_states"("conversation_id", "user_id");
CREATE INDEX "whatsapp_conversation_read_states_user_id_updated_at_idx"
  ON "whatsapp_conversation_read_states"("user_id", "updated_at");
CREATE INDEX "whatsapp_outbound_messages_sent_by_user_id_idx"
  ON "whatsapp_outbound_messages"("sent_by_user_id");
CREATE INDEX "whatsapp_outbound_messages_quote_id_idx"
  ON "whatsapp_outbound_messages"("quote_id");
CREATE INDEX "whatsapp_outbound_messages_file_asset_id_idx"
  ON "whatsapp_outbound_messages"("file_asset_id");

ALTER TABLE "whatsapp_conversations"
  ADD CONSTRAINT "whatsapp_conversations_handled_by_user_id_fkey"
  FOREIGN KEY ("handled_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversation_accesses"
  ADD CONSTRAINT "whatsapp_conversation_accesses_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversation_accesses"
  ADD CONSTRAINT "whatsapp_conversation_accesses_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversation_accesses"
  ADD CONSTRAINT "whatsapp_conversation_accesses_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversation_accesses"
  ADD CONSTRAINT "whatsapp_conversation_accesses_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversation_accesses"
  ADD CONSTRAINT "whatsapp_conversation_accesses_customer_contact_id_fkey"
  FOREIGN KEY ("customer_contact_id") REFERENCES "customer_contacts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversation_accesses"
  ADD CONSTRAINT "whatsapp_conversation_accesses_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversation_read_states"
  ADD CONSTRAINT "whatsapp_conversation_read_states_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversation_read_states"
  ADD CONSTRAINT "whatsapp_conversation_read_states_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_outbound_messages"
  ADD CONSTRAINT "whatsapp_outbound_messages_sent_by_user_id_fkey"
  FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_outbound_messages"
  ADD CONSTRAINT "whatsapp_outbound_messages_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_outbound_messages"
  ADD CONSTRAINT "whatsapp_outbound_messages_file_asset_id_fkey"
  FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

WITH latest_access AS (
  SELECT DISTINCT ON (conversation."id", quote."created_by_user_id")
    conversation."id" AS "conversation_id",
    quote."created_by_user_id" AS "user_id",
    quote."branch_id",
    quote."customer_id",
    attempt."customer_contact_id",
    quote."id" AS "quote_id",
    attempt."sent_at"
  FROM "whatsapp_conversations" AS conversation
  JOIN "quote_delivery_attempts" AS attempt
    ON attempt."recipient" = conversation."participant_phone_e164"
   AND attempt."channel" = 'WHATSAPP'
   AND attempt."status" <> 'FAILED'
  JOIN "quotes" AS quote ON quote."id" = attempt."quote_id"
  ORDER BY conversation."id", quote."created_by_user_id", attempt."sent_at" DESC
)
INSERT INTO "whatsapp_conversation_accesses" (
  "id", "conversation_id", "user_id", "branch_id", "customer_id",
  "customer_contact_id", "quote_id", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(), "conversation_id", "user_id", "branch_id", "customer_id",
  "customer_contact_id", "quote_id", "sent_at", "sent_at"
FROM latest_access
ON CONFLICT ("conversation_id", "user_id") DO NOTHING;

INSERT INTO "whatsapp_outbound_messages" (
  "id", "conversation_id", "provider_message_id", "author_type", "message_type",
  "status", "body", "sent_by_user_id", "quote_id", "file_asset_id",
  "sent_at", "delivered_at", "read_at", "failed_at", "created_at"
)
SELECT
  gen_random_uuid(),
  conversation."id",
  attempt."provider_message_id",
  'USER',
  'QUOTE_DOCUMENT',
  CASE attempt."status"
    WHEN 'SENT' THEN 'SENT'::"WhatsAppOutboundMessageStatus"
    WHEN 'DELIVERED' THEN 'DELIVERED'::"WhatsAppOutboundMessageStatus"
    WHEN 'READ' THEN 'READ'::"WhatsAppOutboundMessageStatus"
    WHEN 'FAILED' THEN 'FAILED'::"WhatsAppOutboundMessageStatus"
    ELSE 'QUEUED'::"WhatsAppOutboundMessageStatus"
  END,
  'Cotización ' || quote."quote_number" || ' enviada.',
  attempt."sent_by_user_id",
  quote."id",
  attempt."file_asset_id",
  attempt."sent_at",
  attempt."delivered_at",
  attempt."read_at",
  attempt."failed_at",
  attempt."created_at"
FROM "quote_delivery_attempts" AS attempt
JOIN "quotes" AS quote ON quote."id" = attempt."quote_id"
JOIN "whatsapp_conversations" AS conversation
  ON conversation."participant_phone_e164" = attempt."recipient"
WHERE attempt."channel" = 'WHATSAPP'
  AND attempt."provider_message_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "whatsapp_outbound_messages" AS existing
    WHERE existing."provider_message_id" = attempt."provider_message_id"
  );

UPDATE "whatsapp_conversations" AS conversation
SET "last_message_at" = GREATEST(
  conversation."last_message_at",
  COALESCE((
    SELECT MAX(message."sent_at")
    FROM "whatsapp_outbound_messages" AS message
    WHERE message."conversation_id" = conversation."id"
  ), conversation."last_message_at")
);
