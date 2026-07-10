CREATE TYPE "QuoteRejectionReason" AS ENUM (
  'PRICE_HIGH',
  'COST_HIGH',
  'MATERIAL_UNAVAILABLE',
  'DELIVERY_TIME',
  'COMPETITOR_SELECTED',
  'COMMERCIAL_TERMS',
  'SPECIFICATION_MISMATCH',
  'LATE_QUOTATION',
  'PROJECT_CANCELLED',
  'NO_CUSTOMER_RESPONSE',
  'DUPLICATE_OR_ERROR',
  'OTHER'
);

ALTER TABLE "quotes"
  ADD COLUMN "rejection_reason" "QuoteRejectionReason",
  ADD COLUMN "rejection_comment" TEXT,
  ADD COLUMN "rejected_at" TIMESTAMP(3),
  ADD COLUMN "rejected_by_user_id" UUID;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_rejected_by_user_id_fkey"
  FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "quotes_rejection_reason_idx" ON "quotes"("rejection_reason");
CREATE INDEX "quotes_rejected_by_user_id_idx" ON "quotes"("rejected_by_user_id");
