CREATE TYPE "WhatsAppLeadStatus" AS ENUM (
  'NEW',
  'COLLECTING_INFORMATION',
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'CONVERTED',
  'DISCARDED'
);

CREATE TABLE "whatsapp_leads" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "phone_e164" VARCHAR(20) NOT NULL,
  "contact_name" VARCHAR(160),
  "company_name" VARCHAR(200),
  "email" VARCHAR(180),
  "location" VARCHAR(180),
  "request_summary" TEXT,
  "status" "WhatsAppLeadStatus" NOT NULL DEFAULT 'NEW',
  "assigned_seller_id" UUID,
  "assigned_branch_id" UUID,
  "assigned_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_lead_assignments" (
  "id" UUID NOT NULL,
  "lead_id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "assigned_by_user_id" UUID NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_lead_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_leads_conversation_id_key" ON "whatsapp_leads"("conversation_id");
CREATE INDEX "whatsapp_leads_status_created_at_idx" ON "whatsapp_leads"("status", "created_at");
CREATE INDEX "whatsapp_leads_phone_e164_idx" ON "whatsapp_leads"("phone_e164");
CREATE INDEX "whatsapp_leads_assigned_seller_id_status_idx" ON "whatsapp_leads"("assigned_seller_id", "status");
CREATE INDEX "whatsapp_leads_assigned_branch_id_status_idx" ON "whatsapp_leads"("assigned_branch_id", "status");
CREATE INDEX "whatsapp_lead_assignments_lead_id_assigned_at_idx" ON "whatsapp_lead_assignments"("lead_id", "assigned_at");
CREATE INDEX "whatsapp_lead_assignments_seller_id_assigned_at_idx" ON "whatsapp_lead_assignments"("seller_id", "assigned_at");
CREATE INDEX "whatsapp_lead_assignments_assigned_by_user_id_assigned_at_idx" ON "whatsapp_lead_assignments"("assigned_by_user_id", "assigned_at");

ALTER TABLE "whatsapp_leads"
  ADD CONSTRAINT "whatsapp_leads_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_leads"
  ADD CONSTRAINT "whatsapp_leads_assigned_seller_id_fkey"
  FOREIGN KEY ("assigned_seller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_leads"
  ADD CONSTRAINT "whatsapp_leads_assigned_branch_id_fkey"
  FOREIGN KEY ("assigned_branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_lead_assignments"
  ADD CONSTRAINT "whatsapp_lead_assignments_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "whatsapp_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_lead_assignments"
  ADD CONSTRAINT "whatsapp_lead_assignments_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_lead_assignments"
  ADD CONSTRAINT "whatsapp_lead_assignments_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "whatsapp_lead_assignments"
  ADD CONSTRAINT "whatsapp_lead_assignments_assigned_by_user_id_fkey"
  FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
