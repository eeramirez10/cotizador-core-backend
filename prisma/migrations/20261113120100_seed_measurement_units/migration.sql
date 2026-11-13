-- The existing scoped unique key does not deduplicate global rows with a NULL branch.
ALTER TABLE "quote_catalog_options" ADD CONSTRAINT "measurement_unit_global"
  CHECK ("type" <> 'MEASUREMENT_UNIT' OR "branch_id" IS NULL);

CREATE UNIQUE INDEX "quote_catalog_options_measurement_unit_code_key"
  ON "quote_catalog_options" ("code") WHERE "type" = 'MEASUREMENT_UNIT';

INSERT INTO "quote_catalog_options" ("id", "type", "code", "label", "sort_order", "updated_at")
SELECT gen_random_uuid(), 'MEASUREMENT_UNIT'::"QuoteCatalogType", code, label, sort_order, NOW()
FROM (VALUES
  ('PZ', 'Pieza', 10), ('K', 'Kilo', 20), ('TON', 'Tonelada', 30), ('M', 'Metro', 40),
  ('ML', 'Metro lineal', 50), ('L', 'Litro', 60), ('TR', 'Tramos', 70), ('SE', 'Servicio', 80),
  ('ACT', 'Actividad', 90), ('FT', 'Pies', 100), ('XRO', 'Rollo', 110), ('UNO', 'Uno', 120),
  ('M2', 'Metro cuadrado', 130), ('LOT', 'Lote', 140), ('CON', 'Conjunto', 150)
) AS units(code, label, sort_order);
