-- CreateEnum
CREATE TYPE "SupplierSource" AS ENUM ('ERP', 'LOCAL');

-- CreateEnum
CREATE TYPE "SupplierScope" AS ENUM ('NATIONAL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "PurchaseRequisitionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'PARTIALLY_QUOTED', 'COST_REVIEW', 'READY_FOR_ORDER', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseRequisitionItemStatus" AS ENUM ('PENDING', 'QUOTING', 'OFFER_SELECTED', 'PENDING_ERP_CODE', 'READY', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseItemSource" AS ENUM ('ERP_NO_STOCK', 'LOCAL_NEW');

-- CreateEnum
CREATE TYPE "PurchaseCostSource" AS ENUM ('ERP_COST', 'SELLER_SUPPLIER_QUOTE', 'ESTIMATED');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "erp_code" VARCHAR(40),
    "name" VARCHAR(220) NOT NULL,
    "canonical_name" VARCHAR(220) NOT NULL,
    "source" "SupplierSource" NOT NULL DEFAULT 'LOCAL',
    "scope" "SupplierScope" NOT NULL DEFAULT 'NATIONAL',
    "country" VARCHAR(100),
    "contact_name" VARCHAR(160),
    "email" VARCHAR(160),
    "phone" VARCHAR(40),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requisitions" (
    "id" UUID NOT NULL,
    "requisition_number" VARCHAR(40) NOT NULL,
    "quote_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "assigned_buyer_user_id" UUID,
    "cost_approved_by_user_id" UUID,
    "status" "PurchaseRequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "delivery_state" VARCHAR(120),
    "delivery_place" VARCHAR(255),
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cost_approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requisition_items" (
    "id" UUID NOT NULL,
    "requisition_id" UUID NOT NULL,
    "quote_item_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "product_id" UUID,
    "source" "PurchaseItemSource" NOT NULL,
    "erp_code" VARCHAR(80),
    "qty" DECIMAL(14,4) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "standard" VARCHAR(120),
    "diameter" VARCHAR(120),
    "thickness" VARCHAR(120),
    "bore" VARCHAR(120),
    "seller_unit_cost" DECIMAL(14,4) NOT NULL,
    "seller_currency" "Currency" NOT NULL,
    "seller_exchange_rate" DECIMAL(14,6) NOT NULL,
    "seller_cost_source" "PurchaseCostSource" NOT NULL,
    "seller_brand" VARCHAR(160),
    "origin_restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seller_delivery_time" VARCHAR(120),
    "delivery_place" VARCHAR(255),
    "status" "PurchaseRequisitionItemStatus" NOT NULL DEFAULT 'PENDING',
    "selected_offer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_supplier_offers" (
    "id" UUID NOT NULL,
    "requisition_item_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_cost" DECIMAL(14,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "exchange_rate" DECIMAL(14,6),
    "subtotal" DECIMAL(14,4) NOT NULL,
    "tax_rate" DECIMAL(8,6) NOT NULL DEFAULT 0.16,
    "tax" DECIMAL(14,4) NOT NULL,
    "total" DECIMAL(14,4) NOT NULL,
    "brand" VARCHAR(160),
    "origin" VARCHAR(120),
    "delivery_time" VARCHAR(120),
    "valid_until" DATE,
    "quote_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "external_reference" VARCHAR(120),
    "notes" TEXT,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_supplier_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_erp_code_key" ON "suppliers"("erp_code");

-- CreateIndex
CREATE INDEX "suppliers_canonical_name_idx" ON "suppliers"("canonical_name");

-- CreateIndex
CREATE INDEX "suppliers_source_is_active_idx" ON "suppliers"("source", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisitions_requisition_number_key" ON "purchase_requisitions"("requisition_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisitions_quote_id_key" ON "purchase_requisitions"("quote_id");

-- CreateIndex
CREATE INDEX "purchase_requisitions_status_created_at_idx" ON "purchase_requisitions"("status", "created_at");

-- CreateIndex
CREATE INDEX "purchase_requisitions_branch_id_idx" ON "purchase_requisitions"("branch_id");

-- CreateIndex
CREATE INDEX "purchase_requisitions_requested_by_user_id_idx" ON "purchase_requisitions"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "purchase_requisitions_assigned_buyer_user_id_idx" ON "purchase_requisitions"("assigned_buyer_user_id");

-- CreateIndex
CREATE INDEX "purchase_requisitions_cost_approved_by_user_id_idx" ON "purchase_requisitions"("cost_approved_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisition_items_quote_item_id_key" ON "purchase_requisition_items"("quote_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisition_items_selected_offer_id_key" ON "purchase_requisition_items"("selected_offer_id");

-- CreateIndex
CREATE INDEX "purchase_requisition_items_requisition_id_status_idx" ON "purchase_requisition_items"("requisition_id", "status");

-- CreateIndex
CREATE INDEX "purchase_requisition_items_product_id_idx" ON "purchase_requisition_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisition_items_requisition_id_position_key" ON "purchase_requisition_items"("requisition_id", "position");

-- CreateIndex
CREATE INDEX "purchase_supplier_offers_requisition_item_id_is_active_idx" ON "purchase_supplier_offers"("requisition_item_id", "is_active");

-- CreateIndex
CREATE INDEX "purchase_supplier_offers_supplier_id_idx" ON "purchase_supplier_offers"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_supplier_offers_created_by_user_id_idx" ON "purchase_supplier_offers"("created_by_user_id");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_assigned_buyer_user_id_fkey" FOREIGN KEY ("assigned_buyer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_cost_approved_by_user_id_fkey" FOREIGN KEY ("cost_approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "quote_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_selected_offer_id_fkey" FOREIGN KEY ("selected_offer_id") REFERENCES "purchase_supplier_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_supplier_offers" ADD CONSTRAINT "purchase_supplier_offers_requisition_item_id_fkey" FOREIGN KEY ("requisition_item_id") REFERENCES "purchase_requisition_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_supplier_offers" ADD CONSTRAINT "purchase_supplier_offers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_supplier_offers" ADD CONSTRAINT "purchase_supplier_offers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_supplier_offers" ADD CONSTRAINT "purchase_supplier_offers_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
