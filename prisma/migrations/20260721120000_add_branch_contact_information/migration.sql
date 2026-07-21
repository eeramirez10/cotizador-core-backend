ALTER TABLE "branches"
  ADD COLUMN "street" VARCHAR(120),
  ADD COLUMN "exterior_number" VARCHAR(40),
  ADD COLUMN "interior_number" VARCHAR(40),
  ADD COLUMN "neighborhood" VARCHAR(120),
  ADD COLUMN "city" VARCHAR(120),
  ADD COLUMN "municipality" VARCHAR(120),
  ADD COLUMN "state" VARCHAR(120),
  ADD COLUMN "postal_code" VARCHAR(10),
  ADD COLUMN "country" VARCHAR(80) DEFAULT 'México',
  ADD COLUMN "email" VARCHAR(160),
  ADD COLUMN "phone" VARCHAR(40),
  ADD COLUMN "secondary_phone" VARCHAR(40);
