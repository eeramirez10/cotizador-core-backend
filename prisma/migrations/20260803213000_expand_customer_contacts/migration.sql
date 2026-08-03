ALTER TABLE "customers"
  ADD COLUMN "billing_exterior_number" VARCHAR(30),
  ADD COLUMN "billing_interior_number" VARCHAR(30),
  ADD COLUMN "billing_neighborhood" VARCHAR(160);

ALTER TABLE "customer_contacts"
  ADD COLUMN "label" VARCHAR(100),
  ADD COLUMN "phone_extension" VARCHAR(20);
