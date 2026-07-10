ALTER TABLE "quotes"
  ADD COLUMN "provided_by_user_id" UUID,
  ADD COLUMN "provided_by_name_snapshot" VARCHAR(260),
  ADD COLUMN "provided_by_branch_name_snapshot" VARCHAR(120),
  ADD COLUMN "provided_at" TIMESTAMP(3),
  ADD COLUMN "provided_by_assigned_by_user_id" UUID;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_provided_by_user_id_fkey"
  FOREIGN KEY ("provided_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_provided_by_assigned_by_user_id_fkey"
  FOREIGN KEY ("provided_by_assigned_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "quotes_provided_by_user_id_idx" ON "quotes"("provided_by_user_id");
