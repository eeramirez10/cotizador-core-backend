CREATE TYPE "QuoteSourceChannel" AS ENUM (
  'UNSPECIFIED',
  'EMAIL',
  'PHONE',
  'WHATSAPP',
  'AI_ASSISTANT',
  'IN_PERSON',
  'OTHER'
);

ALTER TABLE "quotes"
ADD COLUMN "source_channel" "QuoteSourceChannel" NOT NULL DEFAULT 'UNSPECIFIED';
