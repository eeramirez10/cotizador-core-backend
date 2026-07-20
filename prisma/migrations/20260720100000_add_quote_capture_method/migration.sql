CREATE TYPE "QuoteCaptureMethod" AS ENUM ('SYSTEM', 'EXCEL_IMPORT');

ALTER TABLE "quotes"
ADD COLUMN "capture_method" "QuoteCaptureMethod" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN "original_quote_date" DATE;

CREATE INDEX "quotes_capture_method_idx" ON "quotes"("capture_method");
