CREATE UNIQUE INDEX "customers_email_active_unique_idx"
  ON "customers" (LOWER("email"))
  WHERE "is_active" = true AND "email" IS NOT NULL AND BTRIM("email") <> '';

CREATE UNIQUE INDEX "customers_whatsapp_active_unique_idx"
  ON "customers" ("whatsapp")
  WHERE "is_active" = true AND BTRIM("whatsapp") <> '';

CREATE UNIQUE INDEX "customers_tax_id_active_unique_idx"
  ON "customers" (UPPER("tax_id"))
  WHERE "is_active" = true AND "tax_id" IS NOT NULL AND BTRIM("tax_id") <> '';
