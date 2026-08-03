UPDATE "supplier_contacts"
SET
  "value" = lower(trim("value")),
  "normalized_value" = lower(trim("value")),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "channel" = 'EMAIL'::"SupplierContactChannel";

UPDATE "supplier_contacts"
SET
  "normalized_value" = '+' || regexp_replace("value", '[^0-9]', '', 'g'),
  "updated_at" = CURRENT_TIMESTAMP
WHERE
  "channel" = 'PHONE'::"SupplierContactChannel"
  AND trim("value") LIKE '+%'
  AND length(regexp_replace("value", '[^0-9]', '', 'g')) BETWEEN 8 AND 15;

UPDATE "supplier_contacts" AS contact
SET
  "normalized_value" = CASE
    WHEN length(regexp_replace(contact."value", '[^0-9]', '', 'g')) = 10
      THEN '+52' || regexp_replace(contact."value", '[^0-9]', '', 'g')
    WHEN length(regexp_replace(contact."value", '[^0-9]', '', 'g')) = 12
      AND regexp_replace(contact."value", '[^0-9]', '', 'g') LIKE '52%'
      THEN '+' || regexp_replace(contact."value", '[^0-9]', '', 'g')
    WHEN length(regexp_replace(contact."value", '[^0-9]', '', 'g')) = 13
      AND regexp_replace(contact."value", '[^0-9]', '', 'g') LIKE '521%'
      THEN '+52' || substring(regexp_replace(contact."value", '[^0-9]', '', 'g') FROM 4)
    ELSE contact."normalized_value"
  END,
  "updated_at" = CURRENT_TIMESTAMP
FROM "suppliers" AS supplier
WHERE
  contact."supplier_id" = supplier."id"
  AND contact."channel" = 'PHONE'::"SupplierContactChannel"
  AND upper(coalesce(supplier."country", 'MEXICO')) IN ('MEXICO', 'MÉXICO', 'MX');
