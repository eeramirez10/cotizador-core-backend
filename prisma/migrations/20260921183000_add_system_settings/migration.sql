CREATE TABLE IF NOT EXISTS "system_settings" (
  "key" VARCHAR(100) NOT NULL,
  "value" JSONB NOT NULL,
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);
