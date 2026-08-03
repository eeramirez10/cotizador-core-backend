UPDATE "supplier_contacts" AS contact
SET
  "normalized_value" = regexp_replace(contact."value", '[^0-9]', '', 'g'),
  "updated_at" = CURRENT_TIMESTAMP
FROM "suppliers" AS supplier
WHERE
  contact."supplier_id" = supplier."id"
  AND contact."channel" = 'PHONE'::"SupplierContactChannel"
  AND supplier."scope" = 'INTERNATIONAL'::"SupplierScope"
  AND supplier."country" IS NULL
  AND trim(contact."value") NOT LIKE '+%';
