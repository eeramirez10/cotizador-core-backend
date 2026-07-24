-- Initial global options maintained by ADMIN or PURCHASING.
WITH options(type, code, label, value, sort_order) AS (
  VALUES
    ('PURCHASE_BRAND'::"QuoteCatalogType", 'NO_BRAND', 'SIN MARCA', 'SIN MARCA', 10),
    ('PURCHASE_BRAND'::"QuoteCatalogType", 'GENERIC', 'GENÉRICA', 'GENÉRICA', 20),
    ('ORIGIN_RESTRICTION'::"QuoteCatalogType", 'NO_RESTRICTION', 'SIN RESTRICCIÓN', 'SIN RESTRICCIÓN', 10),
    ('ORIGIN_RESTRICTION'::"QuoteCatalogType", 'CHINA', 'CHINA', 'CHINA', 20),
    ('ORIGIN_RESTRICTION'::"QuoteCatalogType", 'TURKEY', 'TURQUÍA', 'TURQUÍA', 30),
    ('ORIGIN_RESTRICTION'::"QuoteCatalogType", 'NATIONAL', 'NACIONAL', 'NACIONAL', 40),
    ('ORIGIN_RESTRICTION'::"QuoteCatalogType", 'UNITED_STATES', 'ESTADOS UNIDOS', 'ESTADOS UNIDOS', 50),
    ('ORIGIN_RESTRICTION'::"QuoteCatalogType", 'INDIA', 'INDIA', 'INDIA', 60),
    ('ORIGIN_RESTRICTION'::"QuoteCatalogType", 'EUROPE', 'EUROPA', 'EUROPA', 70),
    ('ORIGIN_RESTRICTION'::"QuoteCatalogType", 'OTHER', 'OTRA', 'OTRA', 80),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'AGUASCALIENTES', 'Aguascalientes', 'Aguascalientes', 10),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'BAJA_CALIFORNIA', 'Baja California', 'Baja California', 20),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'BAJA_CALIFORNIA_SUR', 'Baja California Sur', 'Baja California Sur', 30),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'CAMPECHE', 'Campeche', 'Campeche', 40),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'CHIAPAS', 'Chiapas', 'Chiapas', 50),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'CHIHUAHUA', 'Chihuahua', 'Chihuahua', 60),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'MEXICO_CITY', 'Ciudad de México', 'Ciudad de México', 70),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'COAHUILA', 'Coahuila', 'Coahuila', 80),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'COLIMA', 'Colima', 'Colima', 90),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'DURANGO', 'Durango', 'Durango', 100),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'STATE_OF_MEXICO', 'Estado de México', 'Estado de México', 110),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'GUANAJUATO', 'Guanajuato', 'Guanajuato', 120),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'GUERRERO', 'Guerrero', 'Guerrero', 130),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'HIDALGO', 'Hidalgo', 'Hidalgo', 140),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'JALISCO', 'Jalisco', 'Jalisco', 150),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'MICHOACAN', 'Michoacán', 'Michoacán', 160),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'MORELOS', 'Morelos', 'Morelos', 170),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'NAYARIT', 'Nayarit', 'Nayarit', 180),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'NUEVO_LEON', 'Nuevo León', 'Nuevo León', 190),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'OAXACA', 'Oaxaca', 'Oaxaca', 200),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'PUEBLA', 'Puebla', 'Puebla', 210),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'QUERETARO', 'Querétaro', 'Querétaro', 220),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'QUINTANA_ROO', 'Quintana Roo', 'Quintana Roo', 230),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'SAN_LUIS_POTOSI', 'San Luis Potosí', 'San Luis Potosí', 240),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'SINALOA', 'Sinaloa', 'Sinaloa', 250),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'SONORA', 'Sonora', 'Sonora', 260),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'TABASCO', 'Tabasco', 'Tabasco', 270),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'TAMAULIPAS', 'Tamaulipas', 'Tamaulipas', 280),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'TLAXCALA', 'Tlaxcala', 'Tlaxcala', 290),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'VERACRUZ', 'Veracruz', 'Veracruz', 300),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'YUCATAN', 'Yucatán', 'Yucatán', 310),
    ('DELIVERY_STATE'::"QuoteCatalogType", 'ZACATECAS', 'Zacatecas', 'Zacatecas', 320)
)
INSERT INTO "quote_catalog_options" (
  "id", "type", "code", "label", "value", "numeric_value", "requires_comment",
  "sort_order", "is_active", "branch_id", "created_at", "updated_at"
)
SELECT gen_random_uuid(), options.type, options.code, options.label, options.value, NULL, false,
  options.sort_order, true, NULL, NOW(), NOW()
FROM options
WHERE NOT EXISTS (
  SELECT 1
  FROM "quote_catalog_options" existing
  WHERE existing."type" = options.type
    AND existing."code" = options.code
    AND existing."branch_id" IS NULL
);
