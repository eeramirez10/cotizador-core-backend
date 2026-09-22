CREATE TYPE "CustomerOnboardingStatus" AS ENUM ('COLLECTING', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CustomerOnboardingSource" AS ENUM ('WHATSAPP', 'MANUAL');

CREATE TABLE "customer_onboardings" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "accepted_quote_id" UUID,
    "conversation_id" UUID,
    "tax_document_attachment_id" UUID,
    "seller_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "source" "CustomerOnboardingSource" NOT NULL DEFAULT 'WHATSAPP',
    "status" "CustomerOnboardingStatus" NOT NULL DEFAULT 'COLLECTING',
    "legal_name" VARCHAR(260),
    "tax_id" VARCHAR(60),
    "tax_regime" VARCHAR(160),
    "cfdi_use" VARCHAR(120),
    "billing_street" VARCHAR(255),
    "billing_exterior_number" VARCHAR(30),
    "billing_interior_number" VARCHAR(30),
    "billing_neighborhood" VARCHAR(160),
    "billing_city" VARCHAR(120),
    "billing_state" VARCHAR(120),
    "billing_postal_code" VARCHAR(20),
    "billing_country" VARCHAR(80),
    "contact_name" VARCHAR(160),
    "contact_email" VARCHAR(180),
    "contact_phone" VARCHAR(40),
    "contact_whatsapp" VARCHAR(40),
    "extraction_confidence" DECIMAL(5,4),
    "extraction_evidence" TEXT,
    "reviewed_by_user_id" UUID,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_onboardings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_onboardings_customer_id_key" ON "customer_onboardings"("customer_id");
CREATE UNIQUE INDEX "customer_onboardings_accepted_quote_id_key" ON "customer_onboardings"("accepted_quote_id");
CREATE UNIQUE INDEX "customer_onboardings_conversation_id_key" ON "customer_onboardings"("conversation_id");
CREATE UNIQUE INDEX "customer_onboardings_tax_document_attachment_id_key" ON "customer_onboardings"("tax_document_attachment_id");
CREATE INDEX "customer_onboardings_status_updated_at_idx" ON "customer_onboardings"("status", "updated_at");
CREATE INDEX "customer_onboardings_seller_id_status_idx" ON "customer_onboardings"("seller_id", "status");
CREATE INDEX "customer_onboardings_branch_id_status_idx" ON "customer_onboardings"("branch_id", "status");

ALTER TABLE "customer_onboardings" ADD CONSTRAINT "customer_onboardings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_onboardings" ADD CONSTRAINT "customer_onboardings_accepted_quote_id_fkey" FOREIGN KEY ("accepted_quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_onboardings" ADD CONSTRAINT "customer_onboardings_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_onboardings" ADD CONSTRAINT "customer_onboardings_tax_document_attachment_id_fkey" FOREIGN KEY ("tax_document_attachment_id") REFERENCES "whatsapp_inbound_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_onboardings" ADD CONSTRAINT "customer_onboardings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_onboardings" ADD CONSTRAINT "customer_onboardings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_onboardings" ADD CONSTRAINT "customer_onboardings_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
