ALTER TABLE "whatsapp_internal_alerts"
ADD COLUMN "target_path" VARCHAR(500),
ADD COLUMN "read_at" TIMESTAMP(3);

CREATE INDEX "whatsapp_internal_alerts_recipient_user_id_type_created_at_idx"
ON "whatsapp_internal_alerts"("recipient_user_id", "type", "created_at");
