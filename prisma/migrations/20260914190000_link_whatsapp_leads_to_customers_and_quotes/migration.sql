ALTER TABLE "whatsapp_leads"
  ADD COLUMN "customer_id" UUID,
  ADD COLUMN "converted_by_user_id" UUID,
  ADD COLUMN "converted_at" TIMESTAMP(3);

ALTER TABLE "quotes"
  ADD COLUMN "whatsapp_lead_id" UUID;

CREATE INDEX "whatsapp_leads_customer_id_idx" ON "whatsapp_leads"("customer_id");
CREATE INDEX "quotes_whatsapp_lead_id_idx" ON "quotes"("whatsapp_lead_id");

ALTER TABLE "whatsapp_leads"
  ADD CONSTRAINT "whatsapp_leads_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_leads"
  ADD CONSTRAINT "whatsapp_leads_converted_by_user_id_fkey"
  FOREIGN KEY ("converted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_whatsapp_lead_id_fkey"
  FOREIGN KEY ("whatsapp_lead_id") REFERENCES "whatsapp_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
