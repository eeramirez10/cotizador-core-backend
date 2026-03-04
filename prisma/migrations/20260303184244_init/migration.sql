-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SELLER', 'MANAGER');

-- CreateEnum
CREATE TYPE "CustomerProfileStatus" AS ENUM ('PROSPECT', 'FISCAL_COMPLETED');

-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('ERP', 'LOCAL');

-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('ERP', 'LOCAL_TEMP');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('MXN', 'USD');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'PENDING', 'QUOTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteOrigin" AS ENUM ('MANUAL', 'FILE_UPLOAD', 'TEXT_INPUT');

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "address" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(120) NOT NULL,
    "last_name" VARCHAR(120) NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "phone" VARCHAR(40),
    "branch_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "source" "CustomerSource" NOT NULL DEFAULT 'LOCAL',
    "external_id" VARCHAR(120),
    "external_system" VARCHAR(80),
    "code" VARCHAR(80),
    "first_name" VARCHAR(120) NOT NULL,
    "last_name" VARCHAR(120) NOT NULL,
    "display_name" VARCHAR(260) NOT NULL,
    "legal_name" VARCHAR(260),
    "email" VARCHAR(160),
    "phone" VARCHAR(40),
    "whatsapp" VARCHAR(40) NOT NULL,
    "tax_id" VARCHAR(60),
    "tax_regime" VARCHAR(120),
    "billing_street" VARCHAR(255),
    "billing_city" VARCHAR(120),
    "billing_state" VARCHAR(120),
    "billing_postal_code" VARCHAR(20),
    "billing_country" VARCHAR(80),
    "profile_status" "CustomerProfileStatus" NOT NULL DEFAULT 'PROSPECT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contacts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "job_title" VARCHAR(120),
    "email" VARCHAR(160),
    "phone" VARCHAR(40),
    "mobile" VARCHAR(40),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "source" "ProductSource" NOT NULL DEFAULT 'LOCAL_TEMP',
    "external_id" VARCHAR(120),
    "external_system" VARCHAR(80),
    "code" VARCHAR(80),
    "ean" VARCHAR(120),
    "description" VARCHAR(500) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "average_cost" DECIMAL(14,4),
    "last_cost" DECIMAL(14,4),
    "stock" DECIMAL(14,4),
    "branch_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "quote_number" VARCHAR(40) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "origin" "QuoteOrigin" NOT NULL DEFAULT 'MANUAL',
    "currency" "Currency" NOT NULL,
    "exchange_rate" DECIMAL(14,6) NOT NULL,
    "exchange_rate_date" DATE NOT NULL,
    "tax_rate" DECIMAL(8,6) NOT NULL,
    "subtotal" DECIMAL(14,4) NOT NULL,
    "tax" DECIMAL(14,4) NOT NULL,
    "total" DECIMAL(14,4) NOT NULL,
    "branch_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "product_id" UUID,
    "external_product_code" VARCHAR(80),
    "ean" VARCHAR(120),
    "customer_description" VARCHAR(500),
    "customer_unit" VARCHAR(30),
    "erp_description" VARCHAR(500),
    "unit" VARCHAR(30) NOT NULL,
    "qty" DECIMAL(14,4) NOT NULL,
    "stock" DECIMAL(14,4),
    "delivery_time" VARCHAR(80),
    "cost" DECIMAL(14,4) NOT NULL,
    "cost_currency" "Currency" NOT NULL,
    "margin_pct" DECIMAL(10,4) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL,
    "subtotal" DECIMAL(14,4) NOT NULL,
    "source_requires_review" BOOLEAN NOT NULL DEFAULT false,
    "requires_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_events" (
    "id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "status" "QuoteStatus" NOT NULL,
    "note" TEXT,
    "actor_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(120) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");

-- CreateIndex
CREATE INDEX "customers_external_id_idx" ON "customers"("external_id");

-- CreateIndex
CREATE INDEX "customers_code_idx" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_display_name_idx" ON "customers"("display_name");

-- CreateIndex
CREATE INDEX "customers_whatsapp_idx" ON "customers"("whatsapp");

-- CreateIndex
CREATE INDEX "customer_contacts_customer_id_idx" ON "customer_contacts"("customer_id");

-- CreateIndex
CREATE INDEX "products_code_idx" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_ean_idx" ON "products"("ean");

-- CreateIndex
CREATE INDEX "products_description_idx" ON "products"("description");

-- CreateIndex
CREATE INDEX "products_branch_id_idx" ON "products"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quote_number_key" ON "quotes"("quote_number");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_branch_id_idx" ON "quotes"("branch_id");

-- CreateIndex
CREATE INDEX "quotes_customer_id_idx" ON "quotes"("customer_id");

-- CreateIndex
CREATE INDEX "quotes_created_by_user_id_idx" ON "quotes"("created_by_user_id");

-- CreateIndex
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items"("quote_id");

-- CreateIndex
CREATE INDEX "quote_items_product_id_idx" ON "quote_items"("product_id");

-- CreateIndex
CREATE INDEX "quote_events_quote_id_idx" ON "quote_events"("quote_id");

-- CreateIndex
CREATE INDEX "quote_events_created_at_idx" ON "quote_events"("created_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_events" ADD CONSTRAINT "quote_events_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_events" ADD CONSTRAINT "quote_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
