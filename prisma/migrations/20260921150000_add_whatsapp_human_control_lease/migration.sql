ALTER TABLE "whatsapp_conversations"
  ADD COLUMN IF NOT EXISTS "human_control_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "human_last_activity_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "whatsapp_conversations_mode_human_control_expires_at_idx"
  ON "whatsapp_conversations"("mode", "human_control_expires_at");
