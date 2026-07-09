CREATE UNIQUE INDEX "users_phone_unique_idx"
  ON "users" ("phone")
  WHERE "phone" IS NOT NULL AND BTRIM("phone") <> '';
