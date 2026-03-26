-- AlterTable
ALTER TABLE "quotes"
ADD COLUMN "delivery_place" VARCHAR(255),
ADD COLUMN "payment_terms" VARCHAR(220) NOT NULL DEFAULT 'CONTADO',
ADD COLUMN "validity_days" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "valid_until" DATE;

UPDATE "quotes"
SET "valid_until" = (
  COALESCE("exchange_rate_date"::date, "created_at"::date) +
  (COALESCE("validity_days", 10) * INTERVAL '1 day')
)::date
WHERE "valid_until" IS NULL;

ALTER TABLE "quotes"
ALTER COLUMN "valid_until" SET NOT NULL;
