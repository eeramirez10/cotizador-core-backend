ALTER TABLE "quote_items"
  ADD COLUMN "effective_cost_at_quote" DECIMAL(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN "is_below_effective_cost" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "effective_cost_variance" DECIMAL(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN "effective_cost_variance_pct" DECIMAL(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN "effective_cost_evaluated_at" TIMESTAMP(3),
  ADD COLUMN "effective_cost_evaluated_by_user_id" UUID;

CREATE INDEX "quote_items_is_below_effective_cost_idx"
  ON "quote_items"("is_below_effective_cost");

CREATE INDEX "quote_items_effective_cost_evaluated_by_user_id_idx"
  ON "quote_items"("effective_cost_evaluated_by_user_id");

ALTER TABLE "quote_items"
  ADD CONSTRAINT "quote_items_effective_cost_evaluated_by_user_id_fkey"
  FOREIGN KEY ("effective_cost_evaluated_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
