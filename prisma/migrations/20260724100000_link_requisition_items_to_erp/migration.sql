ALTER TABLE "purchase_requisition_items"
ADD COLUMN "erp_ean" VARCHAR(120),
ADD COLUMN "erp_linked_at" TIMESTAMP(3),
ADD COLUMN "erp_linked_by_user_id" UUID;

CREATE INDEX "purchase_requisition_items_erp_linked_by_user_id_idx"
ON "purchase_requisition_items"("erp_linked_by_user_id");

ALTER TABLE "purchase_requisition_items"
ADD CONSTRAINT "purchase_requisition_items_erp_linked_by_user_id_fkey"
FOREIGN KEY ("erp_linked_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
