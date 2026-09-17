-- CreateEnum
CREATE TYPE "WhatsAppParticipantType" AS ENUM ('CUSTOMER', 'INTERNAL_USER', 'UNKNOWN');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "whatsapp_phone_e164" VARCHAR(20);

-- Normalize only unambiguous existing user phones. Ambiguous duplicates stay
-- NULL and must be corrected by an administrator before internal WhatsApp use.
WITH normalized AS (
  SELECT
    "id",
    CASE
      WHEN LENGTH(REGEXP_REPLACE(COALESCE("phone", ''), '[^0-9]', '', 'g')) = 13
        AND REGEXP_REPLACE(COALESCE("phone", ''), '[^0-9]', '', 'g') LIKE '521%'
        THEN '+52' || SUBSTRING(REGEXP_REPLACE("phone", '[^0-9]', '', 'g') FROM 4)
      WHEN LENGTH(REGEXP_REPLACE(COALESCE("phone", ''), '[^0-9]', '', 'g')) = 10
        THEN '+52' || REGEXP_REPLACE("phone", '[^0-9]', '', 'g')
      WHEN LENGTH(REGEXP_REPLACE(COALESCE("phone", ''), '[^0-9]', '', 'g')) BETWEEN 11 AND 15
        THEN '+' || REGEXP_REPLACE("phone", '[^0-9]', '', 'g')
      ELSE NULL
    END AS "phone_e164"
  FROM "users"
), unique_phones AS (
  SELECT "phone_e164"
  FROM normalized
  WHERE "phone_e164" IS NOT NULL
  GROUP BY "phone_e164"
  HAVING COUNT(*) = 1
)
UPDATE "users" AS users
SET "whatsapp_phone_e164" = normalized."phone_e164"
FROM normalized
JOIN unique_phones ON unique_phones."phone_e164" = normalized."phone_e164"
WHERE users."id" = normalized."id";

-- CreateIndex
CREATE UNIQUE INDEX "users_whatsapp_phone_e164_key"
ON "users"("whatsapp_phone_e164");

-- AlterTable
ALTER TABLE "whatsapp_conversations"
ADD COLUMN "participant_type" "WhatsAppParticipantType" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "internal_user_id" UUID,
ADD COLUMN "principal_resolved_at" TIMESTAMP(3);

-- Existing conversations linked to a quote delivery remain customer conversations.
UPDATE "whatsapp_conversations" AS conversations
SET
  "participant_type" = 'CUSTOMER',
  "principal_resolved_at" = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1
  FROM "whatsapp_conversation_accesses" AS access
  WHERE access."conversation_id" = conversations."id"
    AND (access."customer_id" IS NOT NULL OR access."quote_id" IS NOT NULL)
);

-- An active internal user takes precedence over customer classification.
UPDATE "whatsapp_conversations" AS conversations
SET
  "participant_type" = 'INTERNAL_USER',
  "internal_user_id" = users."id",
  "principal_resolved_at" = CURRENT_TIMESTAMP,
  "previous_response_id" = NULL
FROM "users" AS users
WHERE users."is_active" = true
  AND users."whatsapp_phone_e164" = conversations."participant_phone_e164";

-- CreateIndex
CREATE INDEX "whatsapp_conversations_participant_type_internal_user_id_idx"
ON "whatsapp_conversations"("participant_type", "internal_user_id");

-- AddForeignKey
ALTER TABLE "whatsapp_conversations"
ADD CONSTRAINT "whatsapp_conversations_internal_user_id_fkey"
FOREIGN KEY ("internal_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "whatsapp_internal_verifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "phone_e164" VARCHAR(20) NOT NULL,
  "verification_requested_at" TIMESTAMP(3),
  "verified_at" TIMESTAMP(3),
  "verified_until" TIMESTAMP(3),
  "failed_attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "whatsapp_internal_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_internal_verifications_user_id_key"
ON "whatsapp_internal_verifications"("user_id");

-- CreateIndex
CREATE INDEX "whatsapp_internal_verifications_phone_e164_idx"
ON "whatsapp_internal_verifications"("phone_e164");

-- CreateIndex
CREATE INDEX "whatsapp_internal_verifications_verified_until_idx"
ON "whatsapp_internal_verifications"("verified_until");

-- AddForeignKey
ALTER TABLE "whatsapp_internal_verifications"
ADD CONSTRAINT "whatsapp_internal_verifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
