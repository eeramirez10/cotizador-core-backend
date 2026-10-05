ALTER TABLE "quote_items" ADD COLUMN "position" INTEGER;

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "quote_id" ORDER BY "created_at", "id")::INTEGER AS "position"
  FROM "quote_items"
)
UPDATE "quote_items" AS item
SET "position" = numbered."position"
FROM numbered
WHERE item."id" = numbered."id";

ALTER TABLE "quote_items" ALTER COLUMN "position" SET NOT NULL;
CREATE UNIQUE INDEX "quote_items_quote_id_position_key" ON "quote_items"("quote_id", "position");
