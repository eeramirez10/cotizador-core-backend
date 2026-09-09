CREATE TYPE "WhatsAppAssistantJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "WhatsAppPendingActionType" AS ENUM ('ACCEPT_QUOTE', 'REJECT_QUOTE');
CREATE TYPE "WhatsAppPendingActionStatus" AS ENUM ('PENDING', 'EXECUTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "QuoteCustomerChangeRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

ALTER TABLE "whatsapp_conversations"
  ADD COLUMN "previous_response_id" VARCHAR(180),
  ADD COLUMN "last_assistant_at" TIMESTAMP(3);

CREATE TABLE "whatsapp_outbound_messages" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "provider_message_id" VARCHAR(160),
  "body" TEXT NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_outbound_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_assistant_jobs" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "inbound_message_id" UUID NOT NULL,
  "status" "WhatsAppAssistantJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_assistant_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_pending_actions" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "action_type" "WhatsAppPendingActionType" NOT NULL,
  "prepared_turn_id" VARCHAR(80) NOT NULL,
  "status" "WhatsAppPendingActionStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "executed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_pending_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_customer_change_requests" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "customer_contact_id" UUID,
  "requested_by_phone" VARCHAR(20) NOT NULL,
  "requested_changes" TEXT NOT NULL,
  "status" "QuoteCustomerChangeRequestStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_customer_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_outbound_messages_provider_message_id_key" ON "whatsapp_outbound_messages"("provider_message_id");
CREATE INDEX "whatsapp_outbound_messages_conversation_id_sent_at_idx" ON "whatsapp_outbound_messages"("conversation_id", "sent_at");
CREATE UNIQUE INDEX "whatsapp_assistant_jobs_inbound_message_id_key" ON "whatsapp_assistant_jobs"("inbound_message_id");
CREATE INDEX "whatsapp_assistant_jobs_status_next_attempt_at_idx" ON "whatsapp_assistant_jobs"("status", "next_attempt_at");
CREATE INDEX "whatsapp_assistant_jobs_conversation_id_created_at_idx" ON "whatsapp_assistant_jobs"("conversation_id", "created_at");
CREATE INDEX "whatsapp_pending_actions_conversation_id_status_expires_at_idx" ON "whatsapp_pending_actions"("conversation_id", "status", "expires_at");
CREATE INDEX "whatsapp_pending_actions_quote_id_status_idx" ON "whatsapp_pending_actions"("quote_id", "status");
CREATE INDEX "whatsapp_customer_change_requests_quote_id_status_created_at_idx" ON "whatsapp_customer_change_requests"("quote_id", "status", "created_at");
CREATE INDEX "whatsapp_customer_change_requests_conversation_id_created_at_idx" ON "whatsapp_customer_change_requests"("conversation_id", "created_at");

ALTER TABLE "whatsapp_outbound_messages" ADD CONSTRAINT "whatsapp_outbound_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_assistant_jobs" ADD CONSTRAINT "whatsapp_assistant_jobs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_assistant_jobs" ADD CONSTRAINT "whatsapp_assistant_jobs_inbound_message_id_fkey" FOREIGN KEY ("inbound_message_id") REFERENCES "whatsapp_inbound_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_pending_actions" ADD CONSTRAINT "whatsapp_pending_actions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_pending_actions" ADD CONSTRAINT "whatsapp_pending_actions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_customer_change_requests" ADD CONSTRAINT "whatsapp_customer_change_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_customer_change_requests" ADD CONSTRAINT "whatsapp_customer_change_requests_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_customer_change_requests" ADD CONSTRAINT "whatsapp_customer_change_requests_customer_contact_id_fkey" FOREIGN KEY ("customer_contact_id") REFERENCES "customer_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
