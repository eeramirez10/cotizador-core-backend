CREATE TYPE "WarehouseAccessMode" AS ENUM ('INHERIT', 'ADDITIVE', 'OVERRIDE');

ALTER TABLE "users"
  ADD COLUMN "warehouse_access_mode" "WarehouseAccessMode" NOT NULL DEFAULT 'INHERIT';

CREATE TABLE "erp_warehouses" (
  "id" UUID NOT NULL,
  "code" VARCHAR(10) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "company_code" VARCHAR(10),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "erp_warehouses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "branch_erp_warehouses" (
  "id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "assigned_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branch_erp_warehouses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_erp_warehouses" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "warehouse_id" UUID NOT NULL,
  "assigned_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_erp_warehouses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "erp_warehouses_code_key" ON "erp_warehouses"("code");
CREATE INDEX "erp_warehouses_is_active_code_idx" ON "erp_warehouses"("is_active", "code");
CREATE UNIQUE INDEX "branch_erp_warehouses_branch_id_warehouse_id_key" ON "branch_erp_warehouses"("branch_id", "warehouse_id");
CREATE INDEX "branch_erp_warehouses_warehouse_id_idx" ON "branch_erp_warehouses"("warehouse_id");
CREATE INDEX "branch_erp_warehouses_assigned_by_user_id_idx" ON "branch_erp_warehouses"("assigned_by_user_id");
CREATE UNIQUE INDEX "user_erp_warehouses_user_id_warehouse_id_key" ON "user_erp_warehouses"("user_id", "warehouse_id");
CREATE INDEX "user_erp_warehouses_warehouse_id_idx" ON "user_erp_warehouses"("warehouse_id");
CREATE INDEX "user_erp_warehouses_assigned_by_user_id_idx" ON "user_erp_warehouses"("assigned_by_user_id");

ALTER TABLE "branch_erp_warehouses"
  ADD CONSTRAINT "branch_erp_warehouses_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branch_erp_warehouses"
  ADD CONSTRAINT "branch_erp_warehouses_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "erp_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "branch_erp_warehouses"
  ADD CONSTRAINT "branch_erp_warehouses_assigned_by_user_id_fkey"
  FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_erp_warehouses"
  ADD CONSTRAINT "user_erp_warehouses_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_erp_warehouses"
  ADD CONSTRAINT "user_erp_warehouses_warehouse_id_fkey"
  FOREIGN KEY ("warehouse_id") REFERENCES "erp_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_erp_warehouses"
  ADD CONSTRAINT "user_erp_warehouses_assigned_by_user_id_fkey"
  FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "erp_warehouses" ("id", "code", "name", "company_code", "updated_at") VALUES
  (gen_random_uuid(), '00', 'ALMACEN CENTRAL', '0', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '01', 'SUC. MEXICO', '0', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '02', 'SUC. MONTERREY', '2', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '03', 'SUC. VERACRUZ', '3', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '04', 'SUC. MEXICALI', '4', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '05', 'SUC. QUERETARO', '5', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '06', 'SUC. CANCUN', '6', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '07', 'SUC. CABOS', '7', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '11', 'NO CALIDAD MEX', '1', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '12', 'RESGUARDO MTY', '1', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '13', 'RESGUARDO VER', '1', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '15', 'RESGUARDO QUERETARO', '0', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '21', 'RESGUARDO MEX', '2', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '22', 'NO CALIDAD MTY', '2', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '23', 'RESGUARDO VER', '2', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '61', 'RESGUARDO MEX', '6', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '62', 'RESGUARDO MTY', '6', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '97', 'TRANSITO VER', '0', CURRENT_TIMESTAMP),
  (gen_random_uuid(), '99', 'TRANSITO MEX', '0', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "branch_erp_warehouses" ("id", "branch_id", "warehouse_id", "created_at")
SELECT gen_random_uuid(), branch."id", warehouse."id", CURRENT_TIMESTAMP
FROM "branches" branch
JOIN "erp_warehouses" warehouse
  ON warehouse."code" = CASE branch."code"
    WHEN '01' THEN '15'
    WHEN '02' THEN '02'
    WHEN '03' THEN '03'
    WHEN '04' THEN '04'
    WHEN '05' THEN '05'
    WHEN '06' THEN '06'
    WHEN '07' THEN '07'
  END
WHERE branch."code" IN ('01', '02', '03', '04', '05', '06', '07')
ON CONFLICT ("branch_id", "warehouse_id") DO NOTHING;
