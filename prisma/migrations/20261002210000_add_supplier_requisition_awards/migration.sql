ALTER TABLE "purchase_supplier_offers" ADD COLUMN "awarded_qty" DECIMAL(14,4);

UPDATE "purchase_supplier_offers" AS offer
SET "awarded_qty" = item."qty"
FROM "purchase_requisition_items" AS item
WHERE offer."requisition_item_id" = item."id" AND offer."is_selected" = true;

CREATE TABLE "purchase_supplier_requisitions" (
    "id" UUID NOT NULL,
    "requisition_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "supplier_name" VARCHAR(220) NOT NULL,
    "number" VARCHAR(48) NOT NULL,
    "currency" "Currency" NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_supplier_requisitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_supplier_requisitions_number_key" ON "purchase_supplier_requisitions"("number");
CREATE UNIQUE INDEX "purchase_supplier_requisitions_requisition_id_supplier_id_currency_key" ON "purchase_supplier_requisitions"("requisition_id", "supplier_id", "currency");
CREATE INDEX "purchase_supplier_requisitions_supplier_id_idx" ON "purchase_supplier_requisitions"("supplier_id");
ALTER TABLE "purchase_supplier_requisitions" ADD CONSTRAINT "purchase_supplier_requisitions_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_supplier_requisitions" ADD CONSTRAINT "purchase_supplier_requisitions_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_supplier_requisitions" ADD CONSTRAINT "purchase_supplier_requisitions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "purchase_supplier_requisition_lines" (
    "id" UUID NOT NULL,
    "supplier_requisition_id" UUID NOT NULL,
    "requisition_item_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "erp_code" VARCHAR(80),
    "supplier_product_code" VARCHAR(120),
    "unit" VARCHAR(30) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "unit_cost" DECIMAL(14,4) NOT NULL,
    "exchange_rate" DECIMAL(14,6),
    "tax_rate" DECIMAL(8,6) NOT NULL,
    "subtotal" DECIMAL(14,4) NOT NULL,
    "tax" DECIMAL(14,4) NOT NULL,
    "total" DECIMAL(14,4) NOT NULL,
    CONSTRAINT "purchase_supplier_requisition_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_supplier_requisition_lines_offer_id_key" ON "purchase_supplier_requisition_lines"("offer_id");
CREATE INDEX "purchase_supplier_requisition_lines_requisition_item_id_idx" ON "purchase_supplier_requisition_lines"("requisition_item_id");
ALTER TABLE "purchase_supplier_requisition_lines" ADD CONSTRAINT "purchase_supplier_requisition_lines_supplier_requisition_id_fkey" FOREIGN KEY ("supplier_requisition_id") REFERENCES "purchase_supplier_requisitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_supplier_requisition_lines" ADD CONSTRAINT "purchase_supplier_requisition_lines_requisition_item_id_fkey" FOREIGN KEY ("requisition_item_id") REFERENCES "purchase_requisition_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_supplier_requisition_lines" ADD CONSTRAINT "purchase_supplier_requisition_lines_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "purchase_supplier_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
