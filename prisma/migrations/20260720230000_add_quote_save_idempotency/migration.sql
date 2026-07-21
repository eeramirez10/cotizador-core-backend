ALTER TABLE "quotes"
ADD COLUMN "client_draft_id" VARCHAR(80);

CREATE UNIQUE INDEX "quotes_created_by_user_id_client_draft_id_key"
ON "quotes"("created_by_user_id", "client_draft_id");
