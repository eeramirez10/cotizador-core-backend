CREATE TYPE "WhatsAppCustomerRequestType" AS ENUM ('INFORMATION', 'MODIFICATION');

CREATE TYPE "WhatsAppInternalAlertType" AS ENUM (
  'LEAD_ASSIGNED',
  'INFORMATION_REQUESTED',
  'QUOTE_CHANGE_REQUESTED',
  'QUOTE_ACCEPTED',
  'QUOTE_REJECTED',
  'FILE_REVIEW_REQUIRED'
);

CREATE TYPE "WhatsAppInternalAlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

ALTER TABLE "whatsapp_customer_change_requests"
ADD COLUMN "request_type" "WhatsAppCustomerRequestType" NOT NULL DEFAULT 'MODIFICATION';

CREATE TABLE "whatsapp_internal_alerts" (
  "id" UUID NOT NULL,
  "event_key" VARCHAR(220) NOT NULL,
  "type" "WhatsAppInternalAlertType" NOT NULL,
  "status" "WhatsAppInternalAlertStatus" NOT NULL DEFAULT 'PENDING',
  "recipient_user_id" UUID NOT NULL,
  "conversation_id" UUID,
  "quote_id" UUID,
  "customer_name" VARCHAR(260) NOT NULL,
  "reference" VARCHAR(160) NOT NULL,
  "detail" VARCHAR(500) NOT NULL,
  "provider_message_id" VARCHAR(160),
  "error_message" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_internal_alerts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_internal_alerts_event_key_key"
ON "whatsapp_internal_alerts"("event_key");

CREATE INDEX "whatsapp_internal_alerts_recipient_user_id_status_created_at_idx"
ON "whatsapp_internal_alerts"("recipient_user_id", "status", "created_at");

CREATE INDEX "whatsapp_internal_alerts_conversation_id_created_at_idx"
ON "whatsapp_internal_alerts"("conversation_id", "created_at");

CREATE INDEX "whatsapp_internal_alerts_quote_id_created_at_idx"
ON "whatsapp_internal_alerts"("quote_id", "created_at");

ALTER TABLE "whatsapp_internal_alerts"
ADD CONSTRAINT "whatsapp_internal_alerts_recipient_user_id_fkey"
FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "whatsapp_internal_alerts"
ADD CONSTRAINT "whatsapp_internal_alerts_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_internal_alerts"
ADD CONSTRAINT "whatsapp_internal_alerts_quote_id_fkey"
FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
