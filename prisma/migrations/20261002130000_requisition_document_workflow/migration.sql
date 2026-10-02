ALTER TABLE "purchase_requisitions"
  ADD COLUMN "supplier_order_reference" VARCHAR(120),
  ADD COLUMN "shipment_reference" VARCHAR(120),
  ADD COLUMN "fob_terms" VARCHAR(255),
  ADD COLUMN "payment_terms" VARCHAR(255),
  ADD COLUMN "quality_certificates_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "marking_instructions" VARCHAR(500);

ALTER TABLE "purchase_requisition_items"
  ADD COLUMN "quotation_owner" "PurchaseOfferSource";
