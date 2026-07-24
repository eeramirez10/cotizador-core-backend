-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuoteCatalogType" ADD VALUE 'PURCHASE_BRAND';
ALTER TYPE "QuoteCatalogType" ADD VALUE 'ORIGIN_RESTRICTION';
ALTER TYPE "QuoteCatalogType" ADD VALUE 'DELIVERY_STATE';

-- AlterTable
ALTER TABLE "purchase_requisition_items" ADD COLUMN     "seller_supplier_id" UUID,
ADD COLUMN     "seller_supplier_name" VARCHAR(220);

-- AlterTable
ALTER TABLE "quote_items" ADD COLUMN     "purchase_bore" VARCHAR(120),
ADD COLUMN     "purchase_diameter" VARCHAR(120),
ADD COLUMN     "purchase_standard" VARCHAR(120),
ADD COLUMN     "purchase_thickness" VARCHAR(120),
ADD COLUMN     "seller_delivery_state" VARCHAR(120),
ADD COLUMN     "seller_origin_restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "seller_quoted_brand" VARCHAR(160),
ADD COLUMN     "seller_quoted_currency" "Currency",
ADD COLUMN     "seller_quoted_unit_cost" DECIMAL(14,4),
ADD COLUMN     "seller_supplier_delivery_time" VARCHAR(120),
ADD COLUMN     "seller_supplier_id" UUID,
ADD COLUMN     "seller_supplier_name_snapshot" VARCHAR(220);

-- CreateIndex
CREATE INDEX "purchase_requisition_items_seller_supplier_id_idx" ON "purchase_requisition_items"("seller_supplier_id");

-- CreateIndex
CREATE INDEX "quote_items_seller_supplier_id_idx" ON "quote_items"("seller_supplier_id");

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_seller_supplier_id_fkey" FOREIGN KEY ("seller_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_seller_supplier_id_fkey" FOREIGN KEY ("seller_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
