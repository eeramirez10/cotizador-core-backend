ALTER TYPE "CustomerOnboardingStatus" ADD VALUE IF NOT EXISTS 'PENDING_CXC';
ALTER TYPE "CustomerOnboardingStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_ERP';
ALTER TYPE "CustomerOnboardingStatus" ADD VALUE IF NOT EXISTS 'ERP_LINKED';
ALTER TYPE "CustomerOnboardingStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "customer_onboardings"
  ADD COLUMN "tax_document_storage_key" VARCHAR(500),
  ADD COLUMN "tax_document_original_name" VARCHAR(255),
  ADD COLUMN "tax_document_mime_type" VARCHAR(120),
  ADD COLUMN "erp_code" VARCHAR(80),
  ADD COLUMN "submitted_at" TIMESTAMP(3),
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "linked_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "customer_onboardings_tax_document_storage_key_key"
  ON "customer_onboardings"("tax_document_storage_key");
