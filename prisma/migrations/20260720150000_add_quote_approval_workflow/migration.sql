ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';

CREATE TYPE "QuoteApprovalReturnReason" AS ENUM (
  'MARGIN_TOO_LOW',
  'PRICE_BELOW_POLICY',
  'INCORRECT_COST',
  'INCORRECT_PRICE',
  'MISSING_INFORMATION',
  'COMMERCIAL_TERMS',
  'DELIVERY_TIME',
  'OTHER'
);

ALTER TABLE "quotes"
ADD COLUMN "approval_return_reason" "QuoteApprovalReturnReason",
ADD COLUMN "approval_return_comment" TEXT;

CREATE INDEX "quotes_approval_return_reason_idx" ON "quotes"("approval_return_reason");
