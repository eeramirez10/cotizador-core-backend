UPDATE "supplier_contacts"
SET "contact_key" = 'legacy-' || SUBSTRING(
  MD5("supplier_id"::text || ':' || UPPER(TRIM("contact_name"))),
  1,
  40
)
WHERE "contact_name" IS NOT NULL
  AND TRIM("contact_name") <> '';
