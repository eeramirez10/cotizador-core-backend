CREATE TYPE "ProductCostStatus" AS ENUM ('PENDING', 'ESTIMATED', 'CONFIRMED');
CREATE TYPE "ProductCostSource" AS ENUM ('ERP', 'SUPPLIER_QUOTE', 'PRICE_LIST', 'MANUAL_ESTIMATE');

ALTER TABLE "products"
  ADD COLUMN "commercial_description" VARCHAR(500),
  ADD COLUMN "family" VARCHAR(80),
  ADD COLUMN "subfamily" VARCHAR(120),
  ADD COLUMN "brand" VARCHAR(120),
  ADD COLUMN "technical_attributes" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "cost_status" "ProductCostStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "cost_source" "ProductCostSource";

UPDATE "products"
SET
  "cost_status" = CASE
    WHEN GREATEST(COALESCE("average_cost", 0), COALESCE("last_cost", 0)) <= 0 THEN 'PENDING'::"ProductCostStatus"
    WHEN "source" = 'ERP' THEN 'CONFIRMED'::"ProductCostStatus"
    ELSE 'ESTIMATED'::"ProductCostStatus"
  END,
  "cost_source" = CASE
    WHEN GREATEST(COALESCE("average_cost", 0), COALESCE("last_cost", 0)) <= 0 THEN NULL
    WHEN "source" = 'ERP' THEN 'ERP'::"ProductCostSource"
    ELSE 'MANUAL_ESTIMATE'::"ProductCostSource"
  END;

CREATE INDEX "products_family_subfamily_idx" ON "products"("family", "subfamily");
CREATE INDEX "products_cost_status_idx" ON "products"("cost_status");
