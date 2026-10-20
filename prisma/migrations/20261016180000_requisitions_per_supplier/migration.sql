DROP INDEX IF EXISTS "purchase_requisitions_quote_id_key";

ALTER TABLE "purchase_requisitions"
  ADD COLUMN "supplier_id" UUID,
  ADD COLUMN "supplier_name" VARCHAR(220);

-- Existing homogeneous requisitions keep their folio and status.
UPDATE "purchase_requisitions" AS requisition
SET "supplier_id" = grouped."supplier_id",
    "supplier_name" = grouped."supplier_name"
FROM (
  SELECT item."requisition_id",
         MIN(item."seller_supplier_id"::text)::uuid AS "supplier_id",
         MAX(COALESCE(item."seller_supplier_name", supplier."name")) AS "supplier_name"
  FROM "purchase_requisition_items" AS item
  LEFT JOIN "suppliers" AS supplier ON supplier."id" = item."seller_supplier_id"
  GROUP BY item."requisition_id"
  HAVING COUNT(*) = COUNT(item."seller_supplier_id")
     AND COUNT(DISTINCT item."seller_supplier_id") = 1
) AS grouped
WHERE requisition."id" = grouped."requisition_id";

-- Split only safe, still-editable mixed drafts. Submitted and finalized legacy
-- requisitions remain intact so their approvals and supplier documents survive.
DO $$
DECLARE
  source_row "purchase_requisitions"%ROWTYPE;
  supplier_row RECORD;
  new_id UUID;
  supplier_index INTEGER;
BEGIN
  FOR source_row IN
    SELECT requisition.*
    FROM "purchase_requisitions" AS requisition
    WHERE requisition."status" = 'DRAFT'
      AND NOT EXISTS (SELECT 1 FROM "purchase_supplier_requisitions" AS document WHERE document."requisition_id" = requisition."id")
      AND (SELECT COUNT(DISTINCT item."seller_supplier_id") FROM "purchase_requisition_items" AS item WHERE item."requisition_id" = requisition."id") > 1
      AND NOT EXISTS (SELECT 1 FROM "purchase_requisition_items" AS item WHERE item."requisition_id" = requisition."id" AND item."seller_supplier_id" IS NULL)
  LOOP
    supplier_index := 0;
    FOR supplier_row IN
      SELECT item."seller_supplier_id" AS id,
             MAX(COALESCE(item."seller_supplier_name", supplier."name")) AS name
      FROM "purchase_requisition_items" AS item
      JOIN "suppliers" AS supplier ON supplier."id" = item."seller_supplier_id"
      WHERE item."requisition_id" = source_row."id"
      GROUP BY item."seller_supplier_id"
      ORDER BY MIN(item."position")
    LOOP
      supplier_index := supplier_index + 1;
      IF supplier_index = 1 THEN
        UPDATE "purchase_requisitions"
        SET "supplier_id" = supplier_row.id, "supplier_name" = supplier_row.name
        WHERE "id" = source_row."id";
      ELSE
        new_id := gen_random_uuid();
        INSERT INTO "purchase_requisitions" (
          "id", "requisition_number", "quote_id", "supplier_id", "supplier_name",
          "branch_id", "requested_by_user_id", "assigned_buyer_user_id", "cost_approved_by_user_id",
          "status", "delivery_state", "delivery_place", "notes", "supplier_order_reference",
          "shipment_reference", "fob_terms", "payment_terms", "quality_certificates_required",
          "marking_instructions", "submitted_at", "completed_at", "cost_approved_at", "created_at", "updated_at"
        ) VALUES (
          new_id, LEFT(source_row."requisition_number", 36) || '-' || LPAD(supplier_index::text, 3, '0'),
          source_row."quote_id", supplier_row.id, supplier_row.name,
          source_row."branch_id", source_row."requested_by_user_id", source_row."assigned_buyer_user_id", source_row."cost_approved_by_user_id",
          source_row."status", source_row."delivery_state", source_row."delivery_place", source_row."notes", source_row."supplier_order_reference",
          source_row."shipment_reference", source_row."fob_terms", source_row."payment_terms", source_row."quality_certificates_required",
          source_row."marking_instructions", source_row."submitted_at", source_row."completed_at", source_row."cost_approved_at", source_row."created_at", source_row."updated_at"
        );
        UPDATE "purchase_requisition_items"
        SET "requisition_id" = new_id
        WHERE "requisition_id" = source_row."id" AND "seller_supplier_id" = supplier_row.id;
        UPDATE "purchase_supplier_quotes"
        SET "requisition_id" = new_id
        WHERE "requisition_id" = source_row."id" AND "supplier_id" = supplier_row.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

CREATE UNIQUE INDEX "purchase_requisitions_quote_id_supplier_id_key"
  ON "purchase_requisitions"("quote_id", "supplier_id");
CREATE INDEX "purchase_requisitions_quote_id_idx" ON "purchase_requisitions"("quote_id");
CREATE INDEX "purchase_requisitions_supplier_id_idx" ON "purchase_requisitions"("supplier_id");
ALTER TABLE "purchase_requisitions"
  ADD CONSTRAINT "purchase_requisitions_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
