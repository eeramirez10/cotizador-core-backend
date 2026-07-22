ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PURCHASING';

CREATE TYPE "ProductProcurementStatus" AS ENUM (
  'PENDING_REVIEW',
  'QUOTING',
  'COSTED',
  'PENDING_ERP',
  'ERP_LINKED',
  'REJECTED'
);

ALTER TABLE "products"
  ADD COLUMN "procurement_status" "ProductProcurementStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  ADD COLUMN "procurement_notes" TEXT,
  ADD COLUMN "selected_procurement_offer_id" UUID,
  ADD COLUMN "procurement_updated_at" TIMESTAMP(3),
  ADD COLUMN "procurement_updated_by_user_id" UUID;

CREATE TABLE "local_product_procurement_offers" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "supplier_name" VARCHAR(220) NOT NULL,
  "contact_name" VARCHAR(160),
  "email" VARCHAR(160),
  "phone" VARCHAR(40),
  "unit_cost" DECIMAL(14,4) NOT NULL,
  "currency" "Currency" NOT NULL,
  "minimum_qty" DECIMAL(14,4),
  "delivery_time" VARCHAR(120),
  "valid_until" DATE,
  "notes" TEXT,
  "is_selected" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "local_product_procurement_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_selected_procurement_offer_id_key" ON "products"("selected_procurement_offer_id");
CREATE INDEX "products_procurement_status_idx" ON "products"("procurement_status");
CREATE INDEX "products_procurement_updated_by_user_id_idx" ON "products"("procurement_updated_by_user_id");
CREATE INDEX "local_product_procurement_offers_product_id_is_active_idx" ON "local_product_procurement_offers"("product_id", "is_active");
CREATE INDEX "local_product_procurement_offers_supplier_name_idx" ON "local_product_procurement_offers"("supplier_name");
CREATE INDEX "local_product_procurement_offers_created_by_user_id_idx" ON "local_product_procurement_offers"("created_by_user_id");

ALTER TABLE "products" ADD CONSTRAINT "products_procurement_updated_by_user_id_fkey"
  FOREIGN KEY ("procurement_updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "local_product_procurement_offers" ADD CONSTRAINT "local_product_procurement_offers_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "local_product_procurement_offers" ADD CONSTRAINT "local_product_procurement_offers_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "local_product_procurement_offers" ADD CONSTRAINT "local_product_procurement_offers_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_selected_procurement_offer_id_fkey"
  FOREIGN KEY ("selected_procurement_offer_id") REFERENCES "local_product_procurement_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
