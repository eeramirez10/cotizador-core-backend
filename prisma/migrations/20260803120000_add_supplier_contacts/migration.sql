CREATE TYPE "SupplierContactChannel" AS ENUM ('EMAIL', 'PHONE');
CREATE TYPE "SupplierPhoneKind" AS ENUM ('LANDLINE', 'MOBILE', 'UNKNOWN');

CREATE TABLE "supplier_contacts" (
  "id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "channel" "SupplierContactChannel" NOT NULL,
  "value" VARCHAR(180) NOT NULL,
  "normalized_value" VARCHAR(180) NOT NULL,
  "phone_kind" "SupplierPhoneKind",
  "is_whatsapp" BOOLEAN NOT NULL DEFAULT false,
  "contact_name" VARCHAR(160),
  "label" VARCHAR(100),
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "supplier_contacts_supplier_id_channel_normalized_value_key"
  ON "supplier_contacts"("supplier_id", "channel", "normalized_value");
CREATE INDEX "supplier_contacts_normalized_value_idx" ON "supplier_contacts"("normalized_value");
CREATE INDEX "supplier_contacts_supplier_id_channel_idx" ON "supplier_contacts"("supplier_id", "channel");

INSERT INTO "supplier_contacts" (
  "id", "supplier_id", "channel", "value", "normalized_value", "phone_kind",
  "is_whatsapp", "contact_name", "label", "is_primary", "created_at", "updated_at"
)
SELECT gen_random_uuid(), "id", 'EMAIL'::"SupplierContactChannel", "email", lower(trim("email")),
  NULL, false, "contact_name", 'Correo principal', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "suppliers"
WHERE "email" IS NOT NULL AND trim("email") <> '';

INSERT INTO "supplier_contacts" (
  "id", "supplier_id", "channel", "value", "normalized_value", "phone_kind",
  "is_whatsapp", "contact_name", "label", "is_primary", "created_at", "updated_at"
)
SELECT gen_random_uuid(), "id", 'PHONE'::"SupplierContactChannel", "phone",
  regexp_replace("phone", '[^0-9]', '', 'g'), 'LANDLINE'::"SupplierPhoneKind",
  false, "contact_name", 'Teléfono principal', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "suppliers"
WHERE "phone" IS NOT NULL AND trim("phone") <> '';

INSERT INTO "supplier_contacts" (
  "id", "supplier_id", "channel", "value", "normalized_value", "phone_kind",
  "is_whatsapp", "contact_name", "label", "is_primary", "created_at", "updated_at"
)
SELECT gen_random_uuid(), "id", 'PHONE'::"SupplierContactChannel", "mobile",
  regexp_replace("mobile", '[^0-9]', '', 'g'), 'MOBILE'::"SupplierPhoneKind",
  false, "contact_name", 'Celular', ("phone" IS NULL OR trim("phone") = ''), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "suppliers"
WHERE "mobile" IS NOT NULL AND trim("mobile") <> ''
ON CONFLICT ("supplier_id", "channel", "normalized_value") DO NOTHING;
