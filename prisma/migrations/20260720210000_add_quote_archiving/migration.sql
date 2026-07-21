ALTER TABLE "quotes"
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "archived_by_user_id" UUID,
  ADD COLUMN "archive_reason" TEXT;

CREATE INDEX "quotes_archived_at_idx" ON "quotes"("archived_at");
CREATE INDEX "quotes_archived_by_user_id_idx" ON "quotes"("archived_by_user_id");

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_archived_by_user_id_fkey"
  FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
