-- CreateEnum
CREATE TYPE "QuoteDeliveryStatus" AS ENUM ('NOT_SENT', 'SENT');

-- CreateEnum
CREATE TYPE "QuoteDeliveryChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "QuoteDeliveryAttemptStatus" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderGenerationStatus" AS ENUM ('NOT_GENERATED', 'GENERATED');

-- CreateEnum
CREATE TYPE "ErpTransferStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADING', 'UPLOADED', 'FAILED');

-- AlterTable
ALTER TABLE "quotes"
  ADD COLUMN "delivery_status" "QuoteDeliveryStatus" NOT NULL DEFAULT 'NOT_SENT',
  ADD COLUMN "first_sent_at" TIMESTAMP(3),
  ADD COLUMN "order_status" "OrderGenerationStatus" NOT NULL DEFAULT 'NOT_GENERATED',
  ADD COLUMN "order_generated_at" TIMESTAMP(3),
  ADD COLUMN "order_reference" VARCHAR(80);

-- CreateTable
CREATE TABLE "quote_delivery_attempts" (
  "id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "channel" "QuoteDeliveryChannel" NOT NULL,
  "recipient" VARCHAR(180) NOT NULL,
  "status" "QuoteDeliveryAttemptStatus" NOT NULL,
  "provider_message_id" VARCHAR(160),
  "error_message" TEXT,
  "sent_by_user_id" UUID,
  "sent_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quote_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_order_exports" (
  "id" UUID NOT NULL,
  "quote_id" UUID NOT NULL,
  "order_reference" VARCHAR(80) NOT NULL,
  "file_name" VARCHAR(180) NOT NULL,
  "transfer_status" "ErpTransferStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  "generated_by_user_id" UUID,
  "generated_at" TIMESTAMP(3) NOT NULL,
  "uploaded_at" TIMESTAMP(3),
  "remote_path" VARCHAR(260),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "quote_order_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_order_reference_key" ON "quotes"("order_reference");

-- CreateIndex
CREATE INDEX "quotes_delivery_status_idx" ON "quotes"("delivery_status");

-- CreateIndex
CREATE INDEX "quotes_order_status_idx" ON "quotes"("order_status");

-- CreateIndex
CREATE INDEX "quote_delivery_attempts_quote_id_idx" ON "quote_delivery_attempts"("quote_id");

-- CreateIndex
CREATE INDEX "quote_delivery_attempts_sent_at_idx" ON "quote_delivery_attempts"("sent_at");

-- CreateIndex
CREATE INDEX "quote_order_exports_quote_id_idx" ON "quote_order_exports"("quote_id");

-- CreateIndex
CREATE INDEX "quote_order_exports_transfer_status_idx" ON "quote_order_exports"("transfer_status");

-- CreateIndex
CREATE INDEX "quote_order_exports_generated_at_idx" ON "quote_order_exports"("generated_at");

-- AddForeignKey
ALTER TABLE "quote_delivery_attempts"
  ADD CONSTRAINT "quote_delivery_attempts_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_delivery_attempts"
  ADD CONSTRAINT "quote_delivery_attempts_sent_by_user_id_fkey"
  FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_order_exports"
  ADD CONSTRAINT "quote_order_exports_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_order_exports"
  ADD CONSTRAINT "quote_order_exports_generated_by_user_id_fkey"
  FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
