-- CreateEnum
CREATE TYPE "QuoteCancellationReason" AS ENUM ('DATA_ENTRY_ERROR', 'DUPLICATE_REQUEST', 'INSUFFICIENT_INFORMATION', 'INCORRECT_ITEMS', 'REPLACED_BY_REVISION', 'OUT_OF_SCOPE', 'ADMINISTRATIVE', 'OTHER');

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "cancellation_comment" TEXT,
ADD COLUMN     "cancellation_reason" "QuoteCancellationReason",
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by_user_id" UUID;

-- CreateIndex
CREATE INDEX "quotes_cancellation_reason_idx" ON "quotes"("cancellation_reason");

-- CreateIndex
CREATE INDEX "quotes_cancelled_by_user_id_idx" ON "quotes"("cancelled_by_user_id");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
