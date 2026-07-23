ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "canonical_description" VARCHAR(500) NOT NULL DEFAULT '';

UPDATE "products"
SET "canonical_description" = UPPER(
  BTRIM(
    REGEXP_REPLACE(
      TRANSLATE(
        "description",
        'ÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãåéèëêíìïîóòöôõúùüûñç',
        'AAAAAAEEEEIIIIOOOOOUUUUNCaaaaaaeeeeiiiiooooouuuunc'
      ),
      '\\s+',
      ' ',
      'g'
    )
  )
)
WHERE "canonical_description" = '';

CREATE INDEX IF NOT EXISTS "products_source_is_active_canonical_description_unit_idx"
ON "products" ("source", "is_active", "canonical_description", "unit");
