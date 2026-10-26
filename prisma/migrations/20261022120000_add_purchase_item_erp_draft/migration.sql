CREATE TABLE "purchase_requisition_item_erp_drafts" (
    "requisition_item_id" UUID NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updated_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchase_requisition_item_erp_drafts_pkey" PRIMARY KEY ("requisition_item_id")
);

ALTER TABLE "purchase_requisition_item_erp_drafts"
    ADD CONSTRAINT "purchase_requisition_item_erp_drafts_requisition_item_id_fkey"
    FOREIGN KEY ("requisition_item_id") REFERENCES "purchase_requisition_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_requisition_item_erp_drafts"
    ADD CONSTRAINT "purchase_requisition_item_erp_drafts_updated_by_user_id_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
