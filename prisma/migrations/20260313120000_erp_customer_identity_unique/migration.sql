WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY source, external_system, external_id
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id,
    row_number() OVER (
      PARTITION BY source, external_system, external_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM customers
  WHERE source = 'ERP'
    AND external_system IS NOT NULL
    AND external_id IS NOT NULL
),
duplicates AS (
  SELECT id, canonical_id
  FROM ranked
  WHERE rn > 1
)
UPDATE quotes q
SET customer_id = d.canonical_id
FROM duplicates d
WHERE q.customer_id = d.id;

WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY source, external_system, external_id
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id,
    row_number() OVER (
      PARTITION BY source, external_system, external_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM customers
  WHERE source = 'ERP'
    AND external_system IS NOT NULL
    AND external_id IS NOT NULL
),
duplicates AS (
  SELECT id, canonical_id
  FROM ranked
  WHERE rn > 1
)
UPDATE customer_contacts cc
SET customer_id = d.canonical_id
FROM duplicates d
WHERE cc.customer_id = d.id;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY source, external_system, external_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM customers
  WHERE source = 'ERP'
    AND external_system IS NOT NULL
    AND external_id IS NOT NULL
)
DELETE FROM customers c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS customers_erp_external_identity_key
ON customers (external_system, external_id)
WHERE source = 'ERP'
  AND external_system IS NOT NULL
  AND external_id IS NOT NULL;
