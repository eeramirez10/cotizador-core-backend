CREATE TYPE "WhatsAppQuoteRequestStatus" AS ENUM (
  'COLLECTING',
  'READY',
  'ASSIGNED',
  'CONVERTED',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
  'CLOSED'
);

CREATE TABLE "whatsapp_quote_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID,
  "lead_id" UUID,
  "customer_id" UUID,
  "quote_id" UUID,
  "summary" TEXT NOT NULL,
  "status" "WhatsAppQuoteRequestStatus" NOT NULL DEFAULT 'COLLECTING',
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_quote_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_quote_requests_quote_id_key"
  ON "whatsapp_quote_requests"("quote_id");
CREATE INDEX "whatsapp_quote_requests_conversation_id_status_updated_at_idx"
  ON "whatsapp_quote_requests"("conversation_id", "status", "updated_at");
CREATE INDEX "whatsapp_quote_requests_lead_id_created_at_idx"
  ON "whatsapp_quote_requests"("lead_id", "created_at");
CREATE INDEX "whatsapp_quote_requests_customer_id_created_at_idx"
  ON "whatsapp_quote_requests"("customer_id", "created_at");
CREATE UNIQUE INDEX "whatsapp_quote_requests_one_active_per_conversation_idx"
  ON "whatsapp_quote_requests"("conversation_id")
  WHERE "status" IN ('COLLECTING', 'READY', 'ASSIGNED');

ALTER TABLE "whatsapp_quote_requests"
  ADD CONSTRAINT "whatsapp_quote_requests_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_quote_requests"
  ADD CONSTRAINT "whatsapp_quote_requests_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "whatsapp_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_quote_requests"
  ADD CONSTRAINT "whatsapp_quote_requests_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_quote_requests"
  ADD CONSTRAINT "whatsapp_quote_requests_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "whatsapp_quote_requests" (
  "conversation_id",
  "lead_id",
  "customer_id",
  "quote_id",
  "summary",
  "status",
  "opened_at",
  "closed_at",
  "created_at",
  "updated_at"
)
SELECT
  lead."conversation_id",
  lead."id",
  lead."customer_id",
  quote."id",
  lead."request_summary",
  CASE
    WHEN quote."status" = 'APPROVED' THEN 'ACCEPTED'::"WhatsAppQuoteRequestStatus"
    WHEN quote."status" = 'REJECTED' THEN 'REJECTED'::"WhatsAppQuoteRequestStatus"
    WHEN quote."status" = 'CANCELLED' THEN 'CANCELLED'::"WhatsAppQuoteRequestStatus"
    WHEN quote."id" IS NOT NULL THEN 'CONVERTED'::"WhatsAppQuoteRequestStatus"
    WHEN lead."status" = 'ASSIGNED' THEN 'ASSIGNED'::"WhatsAppQuoteRequestStatus"
    WHEN lead."status" = 'PENDING_ASSIGNMENT' THEN 'READY'::"WhatsAppQuoteRequestStatus"
    WHEN lead."status" IN ('NEW', 'COLLECTING_INFORMATION') THEN 'COLLECTING'::"WhatsAppQuoteRequestStatus"
    ELSE 'CLOSED'::"WhatsAppQuoteRequestStatus"
  END,
  lead."created_at",
  CASE
    WHEN quote."id" IS NOT NULL OR lead."status" IN ('CONVERTED', 'DISCARDED') THEN COALESCE(quote."updated_at", lead."updated_at")
    ELSE NULL
  END,
  lead."created_at",
  lead."updated_at"
FROM "whatsapp_leads" AS lead
LEFT JOIN LATERAL (
  SELECT q."id", q."status", q."updated_at"
  FROM "quotes" AS q
  WHERE q."whatsapp_lead_id" = lead."id"
  ORDER BY q."updated_at" DESC, q."created_at" DESC
  LIMIT 1
) AS quote ON TRUE
WHERE NULLIF(BTRIM(lead."request_summary"), '') IS NOT NULL;
