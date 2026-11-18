CREATE TABLE "local_product_erp_links" (
  "product_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "erp_code" VARCHAR(80) NOT NULL,
  "erp_ean" VARCHAR(120),
  "erp_description" VARCHAR(500) NOT NULL,
  "erp_unit" VARCHAR(30) NOT NULL,
  "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verified_by_user_id" UUID NOT NULL,
  CONSTRAINT "local_product_erp_links_pkey" PRIMARY KEY ("product_id", "branch_id"),
  CONSTRAINT "local_product_erp_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "local_product_erp_links_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "local_product_erp_links_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "local_product_erp_links_branch_id_erp_code_idx" ON "local_product_erp_links"("branch_id", "erp_code");
