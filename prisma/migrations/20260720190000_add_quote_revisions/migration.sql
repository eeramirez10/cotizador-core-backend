ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'SUPERSEDED';

CREATE TYPE "QuoteRevisionReason" AS ENUM (
  'CUSTOMER_REQUEST',
  'ADD_REMOVE_ITEMS',
  'PRICE_OR_QUANTITY_CHANGE',
  'INFORMATION_CORRECTION',
  'COMMERCIAL_TERMS',
  'OTHER'
);

ALTER TABLE "quotes"
  ADD COLUMN "root_quote_id" UUID,
  ADD COLUMN "previous_version_id" UUID,
  ADD COLUMN "superseded_by_quote_id" UUID,
  ADD COLUMN "revision_number" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "revision_reason" "QuoteRevisionReason",
  ADD COLUMN "revision_comment" TEXT,
  ADD COLUMN "superseded_at" TIMESTAMP(3);

CREATE INDEX "quotes_root_quote_id_idx" ON "quotes"("root_quote_id");
CREATE INDEX "quotes_previous_version_id_idx" ON "quotes"("previous_version_id");
CREATE UNIQUE INDEX "quotes_superseded_by_quote_id_key" ON "quotes"("superseded_by_quote_id");
CREATE UNIQUE INDEX "quotes_root_quote_id_revision_number_key" ON "quotes"("root_quote_id", "revision_number");

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_root_quote_id_fkey"
  FOREIGN KEY ("root_quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "quotes_previous_version_id_fkey"
  FOREIGN KEY ("previous_version_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "quotes_superseded_by_quote_id_fkey"
  FOREIGN KEY ("superseded_by_quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
